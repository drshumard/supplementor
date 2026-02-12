# plan.md

## 1. Objectives
- Replace the clinic’s Google Docs supplement protocol workflow with a fast, error-resistant **desktop web app**.
- Deliver a premium **Apple/Jony Ive–inspired** UI optimized for HC throughput (table-first, minimal cognitive overhead).
- Automate **bottles needed** and **cost totals** for internal HC use, while guaranteeing **no cost leakage** in patient-facing views/exports.
- Provide admin tooling for a centralized, updatable **Master Supplement List** and **Protocol Templates**.
- Maintain historical accuracy by **snapshotting supplement data into plans** at the time plans are created/edited.
- Enforce **role-based access control** (Admin vs HC) and ensure HCs only access their own plans.

**Status (current):** ✅ Application is fully built, feature-complete through Phase 3, and all testing iterations passed.

---

## 2. Implementation Steps (Phased)

### Phase 1 — Core Flow POC (isolation; validate hardest risks first)
**Why:** Highest risk = **PDF pagination/layout** + calculation correctness + clean separation between HC vs patient outputs.

**Scope:**
1) Research server-side PDF generation for FastAPI.
2) Build a POC with:
   - Calculation engine (daily dosage → bottles → costs)
   - Patient PDF export: **one page per month**, **no costs**
   - HC export: includes bottles + costs
3) Validate edge cases:
   - Dosage edits update bottles/cost deterministically
   - Missing/invalid bottle sizes handled safely
   - Long names/instructions wrap without layout breakage

**Exit criteria:** Reliable one-page-per-month PDFs; calculations match formula; no cost leakage.

**Status:** ✅ Completed
- PDF engine selected: **WeasyPrint**
- POC scripts validated: calculations + pagination + cost exclusion confirmed

---

### Phase 2 — V1 App Development (MVP; full end-to-end workflow)
**Deliverable:** Working desktop web app with the complete HC workflow.

**Backend (FastAPI + MongoDB):**
- Implemented models + CRUD:
  - Supplements (master list)
  - Templates (9 templates: 3 programs × 3 steps)
  - Plans (patient info, months, supplements, computed totals)
  - Users (email/password)
- Implemented core services:
  - Structured dosage fields (quantity + frequency/day)
  - Auto-calculations (bottles, monthly totals, program total)
  - Add/remove supplements with step-wide month replication behavior
- Seeded production-like data:
  - **68 real supplements** (provided list)
  - **9 templates** created with default month counts
  - Demo users:
    - admin@clarity.com / admin123
    - hc@clarity.com / hc123
- PDF exports:
  - Patient PDF (no costs, one page per month)
  - HC PDF (includes bottle + cost totals)
- Authentication implemented:
  - Email/password login with JWT

**Frontend (React + shadcn/ui):**
- Apple-inspired design system applied (refined medical palette, precise typography, table-first layout).
- Implemented pages:
  1) Login
  2) Plans Dashboard (search, filter, delete)
  3) New Plan Wizard (Program → Step → Months → Patient Info → Review)
  4) Plan Editor (multi-month tabs, type-ahead supplement add, dosage overrides, auto-calculations)
  5) Admin: Master Supplement List CRUD
  6) Admin: Templates Editor
- Implemented core plan editor behaviors:
  - Type-ahead supplement search + default autofill
  - Row add/remove
  - Month replication within a step
  - Per-month override editing
  - Cost summary panel (HC/internal)
  - PDF export actions

**Status:** ✅ Completed
- End-to-end workflows verified by browser automation and backend tests.
- Phase 2 bugs found & fixed:
  - Role-based access control originally missing in backend → fixed.
  - Dashboard program filter handling of “all” → fixed.
  - PDF export requests updated to include Authorization header → fixed.

---

### Phase 3 — Feature Expansion + Hardening (production readiness)
**Goals:** Close workflow gaps and harden for real clinic use.

**Implemented features:**

**3.1 Plan ownership (HC scoping)**
- Plans store ownership metadata:
  - `created_by` (user id)
  - `created_by_name`
- Access behavior:
  - HC sees **only their plans**
  - Admin sees **all plans**

**3.2 Plan lifecycle (Draft vs Finalized)**
- Added endpoints:
  - `POST /api/plans/{id}/finalize`
  - `POST /api/plans/{id}/reopen`
- UI behavior:
  - Finalized plan is locked from edits
  - Clear finalized banner + locked state
  - Reopen available when needed

**3.3 Plan duplication**
- Added endpoint:
  - `POST /api/plans/{id}/duplicate`
- UI behavior:
  - Duplicate from dashboard and from plan editor
  - Duplicate creates a new draft plan with “(Copy)” suffix

**3.4 Patient View toggle (no-cost preview)**
- Implemented “Patient View Preview” mode in plan editor:
  - Hides costs, bottle counts, and internal-only editing fields
  - Matches what patient PDF will contain

**3.5 Inline validation + integrity**
- Added inline warnings (e.g., missing qty/frequency) in plan editor.

**3.6 Role-based access control enforcement**
- Backend admin-only protection enforced for:
  - Supplement create/update/delete
  - Template updates
- UI navigation also reflects role:
  - HC nav: Dashboard + New Plan only
  - Admin nav: includes Supplements + Templates

**Status:** ✅ Completed
- Phase 3 testing completed (multiple iterations); core features confirmed working.
- Minor improvements made for test reliability:
  - Added stronger `data-testid` hooks for dashboard status badges and duplicate buttons.

---

### Phase 4 — Authentication + Roles (complete production-grade enforcement)
**Note:** This phase is effectively complete within Phase 2 + Phase 3.

**Implemented:**
- JWT auth (email/password)
- Admin vs HC roles
- Admin endpoint enforcement + HC plan scoping
- PDF export requests include auth header

**Status:** ✅ Completed

---

## 3. Next Actions
Since the application is feature-complete, next steps are operational + polish:
1. **Populate templates with clinic-default supplement lists** (admin-managed) to reduce HC editing time.
2. Add optional quality-of-life improvements:
   - Reordering supplements within a plan/template
   - More explicit snapshot rules (locking master fields on finalize)
   - Optional audit trail (who edited what/when)
3. Prepare for production:
   - Configure JWT secret via environment
   - Add password reset flow (optional)
   - Backup strategy for MongoDB
   - Final UI polish pass and performance pass on large plans

---

## 4. Success Criteria
✅ Met for V1:
- Core workflow: HC can create a plan from template, edit multi-month dosages, and export a branded patient PDF quickly.
- PDF export: one page per month, consistent layout, **no cost leakage**.
- Calculations: bottles + costs always match formula; totals correct.
- Data:
  - Master supplement list seeded (68 items) and admin-editable
  - Templates exist (9) and are admin-editable
  - Plans stored historically with ownership attribution
- Security:
  - Role-based access enforced in API and UI
  - HC cannot access admin endpoints
  - HC sees only their plans
- UX:
  - Fast type-ahead search
  - Clean month navigation
  - Clear separation of internal vs patient view
