"""
Supplement Protocol Web App — FastAPI Backend
"""
import os
import math
import json
import base64
import requests
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel as PydanticBaseModel
from dotenv import load_dotenv

# Load .env file — works for both dev and production
load_dotenv()

from fastapi import FastAPI, HTTPException, Query, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from bson.errors import InvalidId
import jwt as pyjwt
from jwt import PyJWKClient

from models import (
    serialize_doc, SupplementCreate, SupplementUpdate,
    TemplateCreate, TemplateUpdate, TemplateSupplementEntry,
    PlanCreate, PlanUpdate, PlanMonth, PlanSupplementEntry,
    UserCreate, UserLogin, UserUpdate,
    PatientCreate, PatientUpdate,
    SupplierCreate, SupplierUpdate
)
from calculations import recalculate_plan_costs
from pdf_generator import generate_patient_pdf, generate_hc_pdf
from seed_data import SUPPLEMENTS, TEMPLATES


# ─── App Setup ───────────────────────────────────────────────────────────────

app = FastAPI(title="Supplement Protocol Manager")

cors_origins = os.environ.get("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(InvalidId)
async def invalid_objectid_handler(request, exc):
    return Response(
        content='{"detail":"Invalid ID format"}',
        status_code=400,
        media_type="application/json"
    )




# ─── Database ────────────────────────────────────────────────────────────────

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "supplement_app")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


# ─── Clerk Auth Helpers ───────────────────────────────────────────────────────

CLERK_SECRET_KEY = os.environ.get("CLERK_SECRET_KEY", "")
CLERK_PK = os.environ.get("CLERK_PUBLISHABLE_KEY", "")

# Derive JWKS URL from publishable key: pk_test_<base64domain> or pk_live_<base64domain>
def _get_clerk_jwks_url():
    parts = CLERK_PK.split("_")
    if len(parts) >= 3:
        try:
            raw = parts[-1]
            raw += "=" * (4 - len(raw) % 4) if len(raw) % 4 else ""
            domain = base64.b64decode(raw).decode().rstrip("$")
            url = f"https://{domain}/.well-known/jwks.json"
            print(f"[Clerk] JWKS URL: {url}")
            return url
        except Exception as e:
            print(f"[Clerk] Failed to derive JWKS URL from publishable key: {e}")
    else:
        print("[Clerk] WARNING: CLERK_PUBLISHABLE_KEY not set in .env")
    return None

_clerk_jwks_url = _get_clerk_jwks_url()
_jwks_client = PyJWKClient(_clerk_jwks_url) if _clerk_jwks_url else None


def verify_clerk_token(token: str):
    """Verify a Clerk JWT and return the payload."""
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload = pyjwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return payload
    except Exception as e:
        print(f"[Clerk Auth] Token verification failed: {e}")
        return None


async def get_current_user(authorization: str = Header(None)):
    """Extract Clerk user from Authorization header, look up local DB user."""
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    payload = verify_clerk_token(token)
    if not payload:
        return None
    
    # Look up local user by clerk_user_id
    clerk_id = payload.get("sub", "")
    local_user = await db.users.find_one({"clerk_user_id": clerk_id})
    if local_user:
        return {
            "sub": str(local_user["_id"]),
            "clerk_user_id": clerk_id,
            "email": local_user.get("email", ""),
            "name": local_user.get("name", ""),
            "role": local_user.get("role", "hc"),
        }
    return {"sub": clerk_id, "clerk_user_id": clerk_id, "role": "hc"}


async def require_auth(authorization: str = Header(None)):
    """Require authenticated user."""
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


async def require_admin(authorization: str = Header(None)):
    """Require admin role."""
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def get_company_freight_map() -> dict:
    """Load supplier freight charges from DB. Returns {supplier_name: freight_charge}."""
    freight = {}
    async for s in db.suppliers.find({}, {"name": 1, "freight_charge": 1}):
        if s.get("freight_charge", 0) > 0:
            freight[s["name"]] = s["freight_charge"]
    return freight


async def sync_plan_with_master(plan: dict) -> dict:
    """Sync plan supplements with latest master data (units_per_bottle, cost, supplier, etc).
    Matches by supplement_id first, then by name."""
    id_map = {}
    name_map = {}
    async for s in db.supplements.find({}):
        sid = str(s["_id"])
        id_map[sid] = s
        name_map[s.get("supplement_name", "").lower()] = s
    
    for month in plan.get("months", []):
        for supp in month.get("supplements", []):
            ref = id_map.get(supp.get("supplement_id", "")) or name_map.get((supp.get("supplement_name") or "").lower())
            if ref:
                supp["units_per_bottle"] = ref.get("units_per_bottle", supp.get("units_per_bottle"))
                supp["cost_per_bottle"] = ref.get("cost_per_bottle", supp.get("cost_per_bottle", 0))
                supp["supplier"] = ref.get("supplier", supp.get("supplier", ""))
                supp["refrigerate"] = ref.get("refrigerate", supp.get("refrigerate", False))
                supp["unit_type"] = ref.get("unit_type", supp.get("unit_type", "caps"))
    return plan


async def get_user_display_name(user: dict) -> str:
    """Get the user's display name for folder naming."""
    user_id = user.get("sub")
    local_user = None
    if user_id:
        from bson import ObjectId as OId
        try:
            local_user = await db.users.find_one({"_id": OId(user_id)})
        except Exception:
            pass
    if not local_user:
        local_user = await db.users.find_one({"clerk_user_id": user.get("clerk_user_id")})
    
    name = user.get("name") or (local_user or {}).get("name") or ""
    if not name:
        name = user.get("email", "").split("@")[0] or "Unknown User"
    return name




# ─── Health ──────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "supplement-protocol-manager"}


# ─── Auth Endpoints (Clerk) ───────────────────────────────────────────────────

class SyncRequest(PydanticBaseModel):
    clerk_user_id: str
    email: str = ""
    name: str = ""

@app.post("/api/auth/sync")
async def sync_user(data: SyncRequest, authorization: str = Header(None)):
    """Sync Clerk user with local DB. Creates local user if first login."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    payload = verify_clerk_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # If name is empty, try fetching from Clerk API
    user_name = data.name.strip()
    if not user_name and CLERK_SECRET_KEY:
        try:
            headers = {"Authorization": f"Bearer {CLERK_SECRET_KEY}"}
            resp = requests.get(f"https://api.clerk.com/v1/users/{data.clerk_user_id}", headers=headers)
            if resp.ok:
                clerk_data = resp.json()
                user_name = f"{clerk_data.get('first_name', '')} {clerk_data.get('last_name', '')}".strip()
        except Exception:
            pass
    if not user_name:
        user_name = data.email.split("@")[0]  # Fallback: use email prefix
    
    # Look up by clerk_user_id first
    local_user = await db.users.find_one({"clerk_user_id": data.clerk_user_id})
    
    if not local_user:
        # Try matching by email (for pre-existing users)
        local_user = await db.users.find_one({"email": data.email.lower()})
        if local_user:
            # Link existing user to Clerk + update name if we have one
            await db.users.update_one(
                {"_id": local_user["_id"]},
                {"$set": {"clerk_user_id": data.clerk_user_id, "name": user_name or local_user.get("name", ""), "updated_at": datetime.utcnow()}}
            )
            local_user = await db.users.find_one({"_id": local_user["_id"]})
        else:
            # First-time user
            user_count = await db.users.count_documents({})
            role = "admin" if user_count == 0 else "hc"
            doc = {
                "clerk_user_id": data.clerk_user_id,
                "email": data.email.lower(),
                "name": user_name,
                "role": role,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
            result = await db.users.insert_one(doc)
            local_user = await db.users.find_one({"_id": result.inserted_id})
    elif not local_user.get("name") and user_name:
        # Existing user with empty name — backfill it
        await db.users.update_one({"_id": local_user["_id"]}, {"$set": {"name": user_name, "updated_at": datetime.utcnow()}})
        local_user["name"] = user_name
    
    safe = serialize_doc(local_user)
    safe.pop("password_hash", None)
    return safe


# ─── User Management (Admin only) ────────────────────────────────────────────

@app.get("/api/users")
async def list_users(
    search: str = "",
    role: str = "",
    user=Depends(require_admin)
):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    if role:
        query["role"] = role
    cursor = db.users.find(query).sort("created_at", -1)
    docs = await cursor.to_list(length=200)
    total = await db.users.count_documents(query)
    safe_docs = []
    for d in serialize_doc(docs):
        d.pop("password_hash", None)
        safe_docs.append(d)
    return {"users": safe_docs, "total": total}


@app.post("/api/users")
async def create_user(data: UserCreate, user=Depends(require_admin)):
    """Pre-register a user with email and role. They'll be linked on first Clerk sign-in."""
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    doc = {
        "email": data.email.lower(),
        "name": data.name,
        "role": data.role,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@app.put("/api/users/{user_id}")
async def update_user(user_id: str, data: UserUpdate, user=Depends(require_admin)):
    existing = await db.users.find_one({"_id": ObjectId(user_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    updates = {}
    if data.email is not None:
        dup = await db.users.find_one({"email": data.email.lower(), "_id": {"$ne": ObjectId(user_id)}})
        if dup:
            raise HTTPException(status_code=400, detail="Email already in use")
        updates["email"] = data.email.lower()
    if data.name is not None:
        updates["name"] = data.name
    if data.role is not None:
        updates["role"] = data.role
    if updates:
        updates["updated_at"] = datetime.utcnow()
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": updates})
    doc = await db.users.find_one({"_id": ObjectId(user_id)})
    safe = serialize_doc(doc)
    safe.pop("password_hash", None)
    return safe


@app.delete("/api/users/{user_id}")
async def delete_user(user_id: str, user=Depends(require_admin)):
    # Prevent deleting yourself
    if user.get("sub") == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"deleted": True}





# ─── Patient Management ──────────────────────────────────────────────────────

@app.get("/api/patients")
async def list_patients(search: str = "", skip: int = 0, limit: int = 100, authorization: str = Header(None)):
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    cursor = db.patients.find(query).sort("name", 1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    total = await db.patients.count_documents(query)
    patients = serialize_doc(docs)
    
    # Batch: get plan counts for all patients in ONE aggregation query
    if patients:
        patient_ids = [p["_id"] for p in patients]
        pipeline = [
            {"$match": {"patient_id": {"$in": patient_ids}}},
            {"$group": {"_id": "$patient_id", "count": {"$sum": 1}}},
        ]
        counts = {}
        async for doc in db.plans.aggregate(pipeline):
            counts[doc["_id"]] = doc["count"]
        for p in patients:
            p["plan_count"] = counts.get(p["_id"], 0)
    
    return {"patients": patients, "total": total}


@app.get("/api/patients/{patient_id}")
async def get_patient(patient_id: str, authorization: str = Header(None)):
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    doc = await db.patients.find_one({"_id": ObjectId(patient_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient = serialize_doc(doc)
    # Get all plans for this patient
    plan_cursor = db.plans.find({"patient_id": patient_id}).sort("updated_at", -1)
    plans = await plan_cursor.to_list(length=100)
    patient["plans"] = serialize_doc(plans)
    return patient


@app.post("/api/patients")
async def create_patient(data: PatientCreate, authorization: str = Header(None)):
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    doc = {
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "date_of_birth": data.date_of_birth,
        "notes": data.notes,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "created_by": user.get("sub"),
        "created_by_name": user.get("name"),
    }
    result = await db.patients.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@app.put("/api/patients/{patient_id}")
async def update_patient(patient_id: str, data: PatientUpdate, authorization: str = Header(None)):
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    existing = await db.patients.find_one({"_id": ObjectId(patient_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Patient not found")
    updates = {k: v for k, v in data.dict().items() if v is not None}
    if updates:
        updates["updated_at"] = datetime.utcnow()
        await db.patients.update_one({"_id": ObjectId(patient_id)}, {"$set": updates})
    doc = await db.patients.find_one({"_id": ObjectId(patient_id)})
    return serialize_doc(doc)


@app.delete("/api/patients/{patient_id}")
async def delete_patient(patient_id: str, user=Depends(require_admin)):
    # Delete patient and all their plans
    await db.plans.delete_many({"patient_id": patient_id})
    result = await db.patients.delete_one({"_id": ObjectId(patient_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"deleted": True}



# ─── Company Management (Admin only) ─────────────────────────────────────────

@app.get("/api/suppliers")
async def list_companies(user=Depends(require_auth)):
    cursor = db.suppliers.find({}).sort("name", 1)
    docs = await cursor.to_list(length=200)
    return {"suppliers": serialize_doc(docs)}


@app.post("/api/suppliers")
async def create_company(data: SupplierCreate, user=Depends(require_admin)):
    existing = await db.suppliers.find_one({"name": {"$regex": f"^{data.name}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=400, detail="Supplier already exists")
    doc = {
        "name": data.name.strip(),
        "freight_charge": data.freight_charge,
        "notes": data.notes,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db.suppliers.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@app.put("/api/suppliers/{company_id}")
async def update_company(company_id: str, data: SupplierUpdate, user=Depends(require_admin)):
    existing = await db.suppliers.find_one({"_id": ObjectId(company_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Supplier not found")
    updates = {k: v for k, v in data.dict().items() if v is not None}
    if "name" in updates:
        updates["name"] = updates["name"].strip()
    if updates:
        updates["updated_at"] = datetime.utcnow()
        await db.suppliers.update_one({"_id": ObjectId(company_id)}, {"$set": updates})
    doc = await db.suppliers.find_one({"_id": ObjectId(company_id)})
    return serialize_doc(doc)


@app.delete("/api/suppliers/{company_id}")
async def delete_company(company_id: str, user=Depends(require_admin)):
    result = await db.suppliers.delete_one({"_id": ObjectId(company_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return {"deleted": True}


# ─── Seed Endpoint ───────────────────────────────────────────────────────────

@app.post("/api/seed")
async def seed_data(user=Depends(require_admin)):
    """Seed the database with initial supplements and templates. Admin only."""
    # Only seed if empty
    supp_count = await db.supplements.count_documents({})
    if supp_count == 0:
        for s in SUPPLEMENTS:
            s["active"] = True
            s["created_at"] = datetime.utcnow()
            s["updated_at"] = datetime.utcnow()
        await db.supplements.insert_many(SUPPLEMENTS)
    
    tmpl_count = await db.templates.count_documents({})
    if tmpl_count == 0:
        for t in TEMPLATES:
            t["created_at"] = datetime.utcnow()
            t["updated_at"] = datetime.utcnow()
        await db.templates.insert_many(TEMPLATES)
    
    # No default users needed — Clerk handles auth
    # First user to sign in gets admin role (handled in /api/auth/sync)
    
    final_supp = await db.supplements.count_documents({})
    final_tmpl = await db.templates.count_documents({})
    final_users = await db.users.count_documents({})
    return {
        "message": "Seed complete",
        "supplements": final_supp,
        "templates": final_tmpl,
        "users": final_users
    }


# ─── Supplements CRUD ────────────────────────────────────────────────────────

@app.get("/api/supplements")
async def list_supplements(
    search: str = "",
    active_only: bool = True,
    skip: int = 0,
    limit: int = 200,
    user=Depends(require_auth)
):
    query = {}
    if active_only:
        query["active"] = True
    if search:
        query["supplement_name"] = {"$regex": search, "$options": "i"}
    
    cursor = db.supplements.find(query).sort("supplement_name", 1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    total = await db.supplements.count_documents(query)
    return {"supplements": serialize_doc(docs), "total": total}


@app.get("/api/supplements/{supplement_id}")
async def get_supplement(supplement_id: str, user=Depends(require_auth)):
    doc = await db.supplements.find_one({"_id": ObjectId(supplement_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Supplement not found")
    return serialize_doc(doc)


@app.post("/api/supplements")
async def create_supplement(data: SupplementCreate, user=Depends(require_admin)):
    doc = data.model_dump()
    doc["created_at"] = datetime.utcnow()
    doc["updated_at"] = datetime.utcnow()
    result = await db.supplements.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@app.put("/api/supplements/{supplement_id}")
async def update_supplement(supplement_id: str, data: SupplementUpdate, user=Depends(require_admin)):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.utcnow()
    result = await db.supplements.update_one(
        {"_id": ObjectId(supplement_id)},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Supplement not found")
    doc = await db.supplements.find_one({"_id": ObjectId(supplement_id)})
    return serialize_doc(doc)


@app.delete("/api/supplements/{supplement_id}")
async def delete_supplement(supplement_id: str, user=Depends(require_admin)):
    result = await db.supplements.delete_one({"_id": ObjectId(supplement_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Supplement not found")
    return {"message": "Deleted"}


# ─── Templates CRUD ──────────────────────────────────────────────────────────

@app.get("/api/templates")
async def list_templates(program_name: str = "", user=Depends(require_auth)):
    query = {}
    if program_name:
        query["program_name"] = program_name
    cursor = db.templates.find(query).sort([("program_name", 1), ("step_number", 1)])
    docs = await cursor.to_list(length=100)
    templates = serialize_doc(docs)
    
    # Build master supplement lookup
    master = {}
    async for s in db.supplements.find({}):
        master[str(s["_id"])] = s
        master[s.get("supplement_name", "").lower()] = s
    
    for tmpl in templates:
        # Convert old flat format to months if needed
        if not tmpl.get("months"):
            default_months = tmpl.get("default_months", 1)
            flat_supps = tmpl.get("supplements", [])
            num = max(1, int(default_months)) if default_months >= 1 else 1
            months = []
            for i in range(num):
                mn = 0.5 if default_months == 0.5 and i == 0 else i + 1
                months.append({"month_number": mn, "supplements": [dict(s) for s in flat_supps]})
            tmpl["months"] = months
        
        # Refresh supplement data from master in all months
        for month in tmpl.get("months", []):
            for supp in month.get("supplements", []):
                ref = master.get(supp.get("supplement_id")) or master.get((supp.get("supplement_name") or "").lower())
                if ref:
                    supp["cost_per_bottle"] = ref.get("cost_per_bottle", supp.get("cost_per_bottle", 0))
                    supp["units_per_bottle"] = ref.get("units_per_bottle", supp.get("units_per_bottle"))
                    supp["supplier"] = ref.get("supplier", supp.get("supplier", ""))
                    supp["company"] = ref.get("company", supp.get("company", ""))
                    supp["refrigerate"] = ref.get("refrigerate", supp.get("refrigerate", False))
                    supp["unit_type"] = ref.get("unit_type", supp.get("unit_type", "caps"))
                    # Backfill qty/freq from master defaults if missing on template
                    if not supp.get("quantity_per_dose"):
                        supp["quantity_per_dose"] = ref.get("default_quantity_per_dose")
                    if not supp.get("frequency_per_day"):
                        supp["frequency_per_day"] = ref.get("default_frequency_per_day")
                    if not supp.get("dosage_display"):
                        supp["dosage_display"] = ref.get("default_dosage_display", "")
                # Backfill times from frequency if missing
                if not supp.get("times"):
                    freq = supp.get("frequency_per_day") or 1
                    if freq >= 3: supp["times"] = ["AM", "Afternoon", "PM"]
                    elif freq == 2: supp["times"] = ["AM", "PM"]
                    else: supp["times"] = ["AM"]
    
    return {"templates": templates}


@app.post("/api/templates")
async def create_template(data: TemplateCreate, user=Depends(require_admin)):
    num = max(1, int(data.default_months)) if data.default_months >= 1 else 1
    months = []
    for i in range(num):
        mn = 0.5 if data.default_months == 0.5 and i == 0 else i + 1
        months.append({"month_number": mn, "supplements": []})
    doc = {
        "program_name": data.program_name,
        "step_number": data.step_number,
        "step_label": f"Step {data.step_number}",
        "default_months": data.default_months,
        "months": months,
        "supplements": [],  # Keep for backward compat
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db.templates.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)

@app.delete("/api/templates/{template_id}")
async def delete_template(template_id: str, user=Depends(require_admin)):
    result = await db.templates.delete_one({"_id": ObjectId(template_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"deleted": True}



@app.get("/api/templates/{template_id}")
async def get_template(template_id: str, user=Depends(require_auth)):
    doc = await db.templates.find_one({"_id": ObjectId(template_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Template not found")
    tmpl = serialize_doc(doc)
    
    # Refresh supplement data from master list
    master = {}
    async for s in db.supplements.find({}):
        master[str(s["_id"])] = s
        master[s.get("supplement_name", "").lower()] = s
    # Convert old flat format to months if needed
    if not tmpl.get("months"):
        default_months = tmpl.get("default_months", 1)
        flat_supps = tmpl.get("supplements", [])
        num = max(1, int(default_months)) if default_months >= 1 else 1
        months = []
        for i in range(num):
            mn = 0.5 if default_months == 0.5 and i == 0 else i + 1
            months.append({"month_number": mn, "supplements": [dict(s) for s in flat_supps]})
        tmpl["months"] = months
    
    # Refresh all months from master
    for month in tmpl.get("months", []):
        for supp in month.get("supplements", []):
            ref = master.get(supp.get("supplement_id")) or master.get((supp.get("supplement_name") or "").lower())
            if ref:
                supp["cost_per_bottle"] = ref.get("cost_per_bottle", supp.get("cost_per_bottle", 0))
                supp["units_per_bottle"] = ref.get("units_per_bottle", supp.get("units_per_bottle"))
                supp["supplier"] = ref.get("supplier", supp.get("supplier", ""))
                supp["company"] = ref.get("company", supp.get("company", ""))
                supp["refrigerate"] = ref.get("refrigerate", supp.get("refrigerate", False))
                supp["unit_type"] = ref.get("unit_type", supp.get("unit_type", "caps"))
                if not supp.get("quantity_per_dose"):
                    supp["quantity_per_dose"] = ref.get("default_quantity_per_dose")
                if not supp.get("frequency_per_day"):
                    supp["frequency_per_day"] = ref.get("default_frequency_per_day")
                if not supp.get("dosage_display"):
                    supp["dosage_display"] = ref.get("default_dosage_display", "")
            # Backfill times from frequency if missing
            if not supp.get("times"):
                freq = supp.get("frequency_per_day") or 1
                if freq >= 3: supp["times"] = ["AM", "Afternoon", "PM"]
                elif freq == 2: supp["times"] = ["AM", "PM"]
                else: supp["times"] = ["AM"]
    
    return tmpl


@app.put("/api/templates/{template_id}")
async def update_template(template_id: str, data: dict = None, user=Depends(require_admin)):
    """Update a template. Accepts months array for month-by-month editing."""
    if not data:
        raise HTTPException(status_code=400, detail="No data provided")
    
    updates = {}
    if "default_months" in data:
        updates["default_months"] = data["default_months"]
    if "months" in data:
        updates["months"] = data["months"]
    # Also keep flat supplements in sync (backward compat) — use month 1's supplements
    if "months" in data and data["months"]:
        updates["supplements"] = data["months"][0].get("supplements", [])
    if "supplements" in data and "months" not in data:
        updates["supplements"] = data["supplements"]
    updates["updated_at"] = datetime.utcnow()
    
    result = await db.templates.update_one(
        {"_id": ObjectId(template_id)},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    doc = await db.templates.find_one({"_id": ObjectId(template_id)})
    return serialize_doc(doc)


# ─── Plans CRUD ──────────────────────────────────────────────────────────────

@app.get("/api/plans/creators")
async def get_plan_creators(user=Depends(require_auth)):
    """Get all users who have created plans, with their plan counts."""
    pipeline = [
        {"$match": {"created_by": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": "$created_by", "name": {"$first": "$created_by_name"}, "count": {"$sum": 1}}},
        {"$sort": {"name": 1}},
    ]
    creators = []
    async for doc in db.plans.aggregate(pipeline):
        creators.append({"user_id": doc["_id"], "name": doc.get("name", "Unknown"), "plan_count": doc["count"]})
    return {"creators": creators}



@app.get("/api/plans")
async def list_plans(
    search: str = "",
    program: str = "",
    status: str = "",
    created_by: str = "",
    skip: int = 0,
    limit: int = 50,
    user=Depends(require_auth)
):
    query = {}
    if search:
        patient_cursor = db.patients.find({"name": {"$regex": search, "$options": "i"}}, {"_id": 1})
        patient_ids = [str(p["_id"]) async for p in patient_cursor]
        query["$or"] = [
            {"patient_id": {"$in": patient_ids}},
            {"patient_name": {"$regex": search, "$options": "i"}},
        ]
    if program:
        query["program_name"] = program
    if status:
        query["status"] = status
    if created_by:
        query["created_by"] = created_by
    
    cursor = db.plans.find(query).sort("updated_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    total = await db.plans.count_documents(query)
    
    # Batch: resolve all patient names in ONE query
    plans = serialize_doc(docs)
    patient_ids = list(set(p["patient_id"] for p in plans if p.get("patient_id")))
    if patient_ids:
        patient_cursor = db.patients.find(
            {"_id": {"$in": [ObjectId(pid) for pid in patient_ids]}},
            {"_id": 1, "name": 1}
        )
        name_map = {}
        async for pdoc in patient_cursor:
            name_map[str(pdoc["_id"])] = pdoc.get("name", "")
        for p in plans:
            if p.get("patient_id") and p["patient_id"] in name_map:
                p["patient_name"] = name_map[p["patient_id"]]
    
    return {"plans": plans, "total": total}


@app.get("/api/plans/{plan_id}")
async def get_plan(plan_id: str, user=Depends(require_auth)):
    doc = await db.plans.find_one({"_id": ObjectId(plan_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan = serialize_doc(doc)
    # Resolve patient name from patient record
    if plan.get("patient_id"):
        patient = await db.patients.find_one({"_id": ObjectId(plan["patient_id"])})
        if patient:
            plan["patient_name"] = patient.get("name", plan.get("patient_name", ""))
    return plan


@app.post("/api/plans")
async def create_plan(data: PlanCreate, authorization: str = Header(None)):
    doc = data.model_dump()
    
    # Associate plan with the creating user
    user = await get_current_user(authorization)
    if user:
        doc["created_by"] = user.get("sub")
        doc["created_by_name"] = user.get("name", "")
    
    # Ensure patient_id is stored
    if data.patient_id:
        doc["patient_id"] = data.patient_id
    
    # If a template_id is provided, load template defaults
    if data.template_id:
        template = await db.templates.find_one({"_id": ObjectId(data.template_id)})
        if template:
            if not doc.get("months") or len(doc["months"]) == 0:
                num_months = template.get("default_months", 1)
                template_supps = template.get("supplements", [])
                months = []
                for m in range(1, num_months + 1):
                    month_supps = []
                    for ts in template_supps:
                        month_supps.append({
                            "supplement_id": ts["supplement_id"],
                            "supplement_name": ts["supplement_name"],
                            "company": ts.get("company", ""),
                            "quantity_per_dose": ts.get("quantity_per_dose"),
                            "frequency_per_day": ts.get("frequency_per_day"),
                            "dosage_display": ts.get("dosage_display", ""),
                            "instructions": ts.get("instructions", ""),
                            "with_food": True,
                            "hc_notes": "",
                            "units_per_bottle": ts.get("units_per_bottle"),
                            "cost_per_bottle": ts.get("cost_per_bottle", 0),
                            "refrigerate": ts.get("refrigerate", False),
                            "bottles_needed": None,
                            "calculated_cost": None,
                        })
                    months.append({
                        "month_number": m,
                        "supplements": month_supps,
                        "monthly_total_cost": 0,
                    })
                doc["months"] = months
    
    # Recalculate costs with freight
    freight_map = await get_company_freight_map()
    doc = await sync_plan_with_master(doc)
    doc = recalculate_plan_costs(doc, freight_map)
    
    doc["status"] = "draft"
    doc["created_at"] = datetime.utcnow()
    doc["updated_at"] = datetime.utcnow()
    
    result = await db.plans.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@app.put("/api/plans/{plan_id}")
async def update_plan(plan_id: str, data: PlanUpdate, user=Depends(require_auth)):
    existing = await db.plans.find_one({"_id": ObjectId(plan_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    updates = {}
    if data.patient_name is not None:
        updates["patient_name"] = data.patient_name
    if data.date is not None:
        updates["date"] = data.date
    if data.program_name is not None:
        updates["program_name"] = data.program_name
    if data.step_label is not None:
        updates["step_label"] = data.step_label
    if data.step_number is not None:
        updates["step_number"] = data.step_number
    if data.status is not None:
        updates["status"] = data.status
    if data.months is not None:
        months_data = [m.model_dump() for m in data.months]
        plan_data = {"months": months_data}
        plan_data = await sync_plan_with_master(plan_data)
        freight_map = await get_company_freight_map()
        plan_data = recalculate_plan_costs(plan_data, freight_map)
        updates["months"] = plan_data["months"]
        updates["total_program_cost"] = plan_data["total_program_cost"]
    
    updates["updated_at"] = datetime.utcnow()
    
    await db.plans.update_one(
        {"_id": ObjectId(plan_id)},
        {"$set": updates}
    )
    doc = await db.plans.find_one({"_id": ObjectId(plan_id)})
    return serialize_doc(doc)


@app.delete("/api/plans/{plan_id}")
async def delete_plan(plan_id: str, user=Depends(require_auth)):
    result = await db.plans.delete_one({"_id": ObjectId(plan_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"message": "Deleted"}


class DuplicateRequest(PydanticBaseModel):
    target: str = "same"  # "same", "existing", "new"
    patient_id: Optional[str] = None
    new_patient_name: Optional[str] = None
    new_patient_email: Optional[str] = None
    new_patient_phone: Optional[str] = None

@app.post("/api/plans/{plan_id}/duplicate")
async def duplicate_plan(plan_id: str, body: DuplicateRequest = None, user=Depends(require_auth), authorization: str = Header(None)):
    """Duplicate a plan — same patient, existing patient, or new patient."""
    doc = await db.plans.find_one({"_id": ObjectId(plan_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    user = await get_current_user(authorization)
    
    # Create new plan based on existing
    new_doc = {k: v for k, v in doc.items() if k != "_id"}
    new_doc["status"] = "draft"
    new_doc["date"] = datetime.utcnow().strftime("%Y-%m-%d")
    new_doc["created_at"] = datetime.utcnow()
    new_doc["updated_at"] = datetime.utcnow()
    if user:
        new_doc["created_by"] = user.get("sub")
        new_doc["created_by_name"] = user.get("name", "")
    
    if body and body.target == "existing" and body.patient_id:
        # Link to existing patient
        patient = await db.patients.find_one({"_id": ObjectId(body.patient_id)})
        if patient:
            new_doc["patient_id"] = body.patient_id
            new_doc["patient_name"] = patient.get("name", "")
    elif body and body.target == "new" and body.new_patient_name:
        # Create new patient
        new_patient = {
            "name": body.new_patient_name,
            "email": body.new_patient_email or "",
            "phone": body.new_patient_phone or "",
            "date_of_birth": "",
            "notes": "",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        if user:
            new_patient["created_by"] = user.get("sub")
            new_patient["created_by_name"] = user.get("name", "")
        result = await db.patients.insert_one(new_patient)
        new_doc["patient_id"] = str(result.inserted_id)
        new_doc["patient_name"] = body.new_patient_name
    else:
        # Same patient (default)
        new_doc["patient_name"] = doc.get("patient_name", "Copy") + " (Copy)"
    
    result = await db.plans.insert_one(new_doc)
    new_doc["_id"] = result.inserted_id
    return serialize_doc(new_doc)


@app.post("/api/plans/{plan_id}/finalize")
async def finalize_plan(plan_id: str, user=Depends(require_auth)):
    """Finalize a plan (lock it from further edits)."""
    doc = await db.plans.find_one({"_id": ObjectId(plan_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    await db.plans.update_one(
        {"_id": ObjectId(plan_id)},
        {"$set": {"status": "finalized", "finalized_at": datetime.utcnow(), "updated_at": datetime.utcnow()}}
    )
    doc = await db.plans.find_one({"_id": ObjectId(plan_id)})
    return serialize_doc(doc)


@app.post("/api/plans/{plan_id}/reopen")
async def reopen_plan(plan_id: str, user=Depends(require_auth)):
    """Reopen a finalized plan."""
    doc = await db.plans.find_one({"_id": ObjectId(plan_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    await db.plans.update_one(
        {"_id": ObjectId(plan_id)},
        {"$set": {"status": "draft", "updated_at": datetime.utcnow()}, "$unset": {"finalized_at": ""}}
    )
    doc = await db.plans.find_one({"_id": ObjectId(plan_id)})
    return serialize_doc(doc)


# ─── Plan PDF Export ─────────────────────────────────────────────────────────

@app.get("/api/plans/{plan_id}/export/patient")
async def export_patient_pdf(plan_id: str, user=Depends(require_auth)):
    doc = await db.plans.find_one({"_id": ObjectId(plan_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    plan = serialize_doc(doc)
    # Ensure dosage_display is set for all supplements
    for month in plan.get("months", []):
        for supp in month.get("supplements", []):
            if not supp.get("dosage_display"):
                q = supp.get("quantity_per_dose", 0) or 0
                f = supp.get("frequency_per_day", 0) or 0
                if q and f:
                    supp["dosage_display"] = f"{q} cap{'s' if q > 1 else ''}, {f}x/day"
    
    pdf_bytes = bytes(generate_patient_pdf(plan))
    patient_name = plan.get('patient_name', 'patient')
    program = plan.get('program_name', 'Protocol')
    step = plan.get('step_label', '')
    filename = f"Patient - {patient_name} - {program} {step}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@app.get("/api/plans/{plan_id}/export/hc")
async def export_hc_pdf(plan_id: str, user=Depends(require_auth)):
    doc = await db.plans.find_one({"_id": ObjectId(plan_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    plan = serialize_doc(doc)
    freight_map = await get_company_freight_map()
    plan = await sync_plan_with_master(plan)
    plan = recalculate_plan_costs(plan, freight_map)
    
    # Ensure dosage_display
    for month in plan.get("months", []):
        for supp in month.get("supplements", []):
            if not supp.get("dosage_display"):
                q = supp.get("quantity_per_dose", 0) or 0
                f = supp.get("frequency_per_day", 0) or 0
                if q and f:
                    supp["dosage_display"] = f"{q} cap{'s' if q > 1 else ''}, {f}x/day"
    
    pdf_bytes = bytes(generate_hc_pdf(plan))
    patient_name = plan.get('patient_name', 'patient')
    program = plan.get('program_name', 'Protocol')
    step = plan.get('step_label', '')
    filename = f"HC - {patient_name} - {program} {step}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )



# ─── Dropbox Save ─────────────────────────────────────────────────────────

@app.post("/api/plans/{plan_id}/save-to-cloud")
async def save_plan_to_cloud(plan_id: str, authorization: str = Header(None)):
    """Generate both PDFs and upload to Dropbox in practitioner/patient folder."""
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    doc = await db.plans.find_one({"_id": ObjectId(plan_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    plan = serialize_doc(doc)
    plan = await sync_plan_with_master(plan)
    freight_map = await get_company_freight_map()
    plan = recalculate_plan_costs(plan, freight_map)
    
    patient_name = plan.get("patient_name", "Unknown")
    program = plan.get("program_name", "Protocol")
    step = plan.get("step_label", "")
    practitioner_name = await get_user_display_name(user)
    
    try:
        from dropbox_integration import upload_pdf
        
        hc_pdf = bytes(generate_hc_pdf(plan))
        hc_filename = f"HC - {patient_name} - {program} {step}.pdf"
        hc_result = upload_pdf(practitioner_name, patient_name, hc_filename, hc_pdf)
        
        return {
            "success": True,
            "hc_pdf": hc_result,
            "message": f"Saved to Dropbox in '{practitioner_name}/{patient_name}' folder",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dropbox upload failed: {str(e)}")


@app.post("/api/patients/{patient_id}/save-all-to-cloud")
async def save_all_plans_to_cloud(patient_id: str, user=Depends(require_auth)):
    """Save ALL plans for a patient to Dropbox."""
    patient = await db.patients.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    patient_name = patient.get("name", "Unknown")
    practitioner_name = await get_user_display_name(user)
    
    plan_cursor = db.plans.find({"patient_id": patient_id}).sort("updated_at", -1)
    plans = await plan_cursor.to_list(length=100)
    
    if not plans:
        raise HTTPException(status_code=400, detail="No plans found for this patient")
    
    try:
        from dropbox_integration import upload_pdf
        
        freight_map = await get_company_freight_map()
        uploaded = []
        
        for doc in plans:
            plan = serialize_doc(doc)
            plan = await sync_plan_with_master(plan)
            plan = recalculate_plan_costs(plan, freight_map)
            
            program = plan.get("program_name", "Protocol")
            step = plan.get("step_label", "")
            
            hc_pdf = bytes(generate_hc_pdf(plan))
            hc_filename = f"HC - {patient_name} - {program} {step}.pdf"
            uploaded.append(upload_pdf(practitioner_name, patient_name, hc_filename, hc_pdf))
        
        return {
            "success": True,
            "files_uploaded": len(uploaded),
            "plans_exported": len(plans),
            "message": f"Saved {len(plans)} plan(s) ({len(uploaded)} PDFs) to Dropbox '{practitioner_name}/{patient_name}'",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dropbox upload failed: {str(e)}")




# ─── Startup ─────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    """Create indexes + auto-seed on startup if database is empty."""
    # Indexes for query performance
    await db.plans.create_index("patient_id")
    await db.plans.create_index("updated_at")
    await db.plans.create_index("program_name")
    await db.plans.create_index("status")
    await db.patients.create_index("name")
    await db.patients.create_index("email")
    await db.users.create_index("email", unique=True)
    await db.supplements.create_index("supplement_name")
    await db.suppliers.create_index("name", unique=True)
    
    # Auto-seed companies from existing supplement data if companies collection is empty
    company_count = await db.suppliers.count_documents({})
    if company_count == 0:
        existing_companies = set()
        async for s in db.supplements.find({}, {"company": 1}):
            c = (s.get("company") or "").strip()
            if c:
                existing_companies.add(c)
        if existing_companies:
            company_docs = [
                {"name": name, "freight_charge": 0.0, "notes": "", "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()}
                for name in sorted(existing_companies)
            ]
            await db.suppliers.insert_many(company_docs)
            print(f"Seeded {len(company_docs)} companies from supplement data")
    
    supp_count = await db.supplements.count_documents({})
    if supp_count == 0:
        print("Database empty, auto-seeding...")
        # Import fresh seed data
        from seed_data import SUPPLEMENTS as FRESH_SUPPS, TEMPLATES as FRESH_TMPLS
        import copy
        supps = copy.deepcopy(FRESH_SUPPS)
        tmpls = copy.deepcopy(FRESH_TMPLS)
        for s in supps:
            s["active"] = True
            s["created_at"] = datetime.utcnow()
            s["updated_at"] = datetime.utcnow()
        await db.supplements.insert_many(supps)
        
        for t in tmpls:
            t["created_at"] = datetime.utcnow()
            t["updated_at"] = datetime.utcnow()
        await db.templates.insert_many(tmpls)
        
        print("Seed complete! First user to sign in gets admin role.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
