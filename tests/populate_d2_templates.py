"""
Populate Detox 2 Step 2 and Step 3 templates from Google Doc data.
Also adds BC-ATP supplement if missing.
"""
import requests
import json

API = "http://localhost:8001/api"

# Login as admin
r = requests.post(f"{API}/auth/login", json={"email":"admin@clarity.com","password":"admin123"})
token = r.json()["token"]
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# Get all supplements
r = requests.get(f"{API}/supplements?limit=200&active_only=false", headers=headers)
all_supps = r.json()["supplements"]
supp_map = {s["supplement_name"]: s for s in all_supps}

# Add BC-ATP if missing
if "BC-ATP" not in supp_map:
    print("Adding missing supplement: BC-ATP")
    r = requests.post(f"{API}/supplements", headers=headers, json={
        "supplement_name": "BC-ATP",
        "company": "Cellcore",
        "units_per_bottle": 60,
        "unit_type": "caps",
        "default_quantity_per_dose": 1,
        "default_frequency_per_day": 2,
        "default_dosage_display": "1 cap 2x/day",
        "cost_per_bottle": 0,
        "default_instructions": "With food",
        "refrigerate": False,
        "notes": "Added from Detox 2 Step 2 template. Price TBD.",
        "bottles_per_month": None,
        "active": True
    })
    new_supp = r.json()
    supp_map["BC-ATP"] = new_supp
    print(f"  Created: {new_supp.get('supplement_name')} (ID: {new_supp.get('_id')})")

# Fuzzy match helper
def find_supp(name):
    if name in supp_map:
        return supp_map[name]
    for k, v in supp_map.items():
        if k.lower() == name.lower():
            return v
    name_lower = name.lower()
    for k, v in supp_map.items():
        if name_lower in k.lower() or k.lower() in name_lower:
            return v
    print(f"  WARNING: Could not find supplement: {name}")
    return None

def make_entry(name, qty, freq, dosage_display, instructions="With food", refrigerate=None):
    s = find_supp(name)
    if not s:
        return None
    if refrigerate is None:
        refrigerate = s.get("refrigerate", False)
    return {
        "supplement_id": s["_id"],
        "supplement_name": s["supplement_name"],
        "company": s.get("company", ""),
        "quantity_per_dose": qty,
        "frequency_per_day": freq,
        "dosage_display": dosage_display,
        "instructions": instructions,
        "units_per_bottle": s.get("units_per_bottle"),
        "cost_per_bottle": s.get("cost_per_bottle", 0),
        "refrigerate": refrigerate
    }

# Get all templates
r = requests.get(f"{API}/templates", headers=headers)
templates = r.json()["templates"]

def find_template(program, step):
    return next((t for t in templates if t["program_name"] == program and t["step_number"] == step), None)


# ═══════════════════════════════════════════════════════════════════
# DETOX 2, STEP 2 (4 months)
# Template will use Month 1 as the base; HC can customize per-month
# Unique supplements across all months:
# Seed, BC-ATP, KL Support, Glutathione, CT Minerals, Biotoxin Binder,
# Carboxy, HM-ET Binder (M2+), Viradchem Binder (M2 only), LymphActiv (M3 only)
# ═══════════════════════════════════════════════════════════════════
print("\n=== Detox 2, Step 2 (4 months) ===")
d2s2_supps = [
    make_entry("Seed", 2, 1, "2 caps/day", "20 min before eating, without food"),
    make_entry("BC-ATP", 1, 2, "1 cap 2x/day (AM + PM)", "With food"),
    make_entry("KL Support", 1, 2, "1 cap 2x/day (AM + PM)", "With food"),
    make_entry("Liposomal Glutathione", 2, 2, "2 pumps 2x/day (AM + PM)", "With food. Refrigerate.", True),
    make_entry("CT Minerals", 1, 1, "1 cap/day (Afternoon)", "With food"),
    make_entry("Biotoxin Binder", 1, 2, "1 cap 2x/day (PM)", "With food"),
    make_entry("Carboxy", 1, 1, "1/2 scoop in H2O", "30 min before bed, without food"),
    make_entry("HM-ET Binder", 2, 2, "2 caps 2x/day (AM + PM)", "With food. Starts Month 2."),
    make_entry("VIRADCHEM Binder", 1, 1, "1 cap/day (Afternoon)", "With food. Month 2 only."),
    make_entry("LymphActive", 1, 2, "1 cap 2x/day (AM + PM)", "With food. Month 3 only."),
]
d2s2_supps = [e for e in d2s2_supps if e is not None]

tmpl = find_template("Detox 2", 2)
if tmpl:
    r = requests.put(f"{API}/templates/{tmpl['_id']}", headers=headers, json={
        "default_months": 4,
        "supplements": d2s2_supps
    })
    result = r.json()
    print(f"  Updated Detox 2 Step 2: {len(result.get('supplements',[]))} supplements, 4 months")


# ═══════════════════════════════════════════════════════════════════
# DETOX 2, STEP 3 (2 months)
# Both months identical:
# Seed, MetaboClear + GI ResQ combo, Hypaxx Balance (3x/day), Berberine X (2x/day)
# ═══════════════════════════════════════════════════════════════════
print("\n=== Detox 2, Step 3 (2 months) ===")
d2s3_supps = [
    make_entry("Seed", 2, 1, "2 caps/day", "20 min before eating, without food"),
    make_entry("Metaboclear (Chocolate)", 1, 1, "1 scoop/day", "With food (AM). Combo with GI ResQ in 12oz H2O or nut milk."),
    make_entry("GI ResQ", 1, 1, "1 scoop/day", "With food (AM). Combo with MetaboClear in 12oz H2O or nut milk."),
    make_entry("Hypaxx Balance", 1, 3, "1 cap 3x/day (AM, Afternoon, PM)", "With food"),
    make_entry("Berberine-X", 1, 2, "1 cap 2x/day (AM + PM)", "With food"),
]
d2s3_supps = [e for e in d2s3_supps if e is not None]

tmpl = find_template("Detox 2", 3)
if tmpl:
    r = requests.put(f"{API}/templates/{tmpl['_id']}", headers=headers, json={
        "default_months": 2,
        "supplements": d2s3_supps
    })
    result = r.json()
    print(f"  Updated Detox 2 Step 3: {len(result.get('supplements',[]))} supplements, 2 months")


print("\n" + "=" * 60)
print("Templates populated!")
print("=" * 60)

# Summary
r = requests.get(f"{API}/templates", headers=headers)
for t in r.json()["templates"]:
    count = len(t.get("supplements", []))
    print(f"  {t['program_name']} Step {t['step_number']}: {count} supplements, {t.get('default_months', '?')} months")
