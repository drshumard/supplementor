# plan.md

## 1. Objectives
- Replace the clinic’s Google Docs supplement protocol workflow with a fast, error-resistant desktop web app.
- Deliver a premium, Apple/Jony Ive–inspired UI optimized for HC throughput (table-first, keyboard-friendly, minimal cognitive overhead).
- Ensure correct automation of **bottles needed** and **cost totals** for internal use, while guaranteeing **no cost leakage** in patient-facing exports.
- Provide admin tooling for a centralized, updatable master supplement list and protocol templates.
- Maintain historical accuracy via snapshotting master supplement data into plans at creation time.

**Status update (current):** Core app is built end-to-end (Plans dashboard, New Plan wizard, Plan editor, Admin supplements/templates, PDF exports) with seeded real supplement data and working calculations.

---

## 2. Implementation Steps (Phased)

### Phase 1 — Core Flow POC (isolation; do not proceed until solid)
**Why:** Highest risk = **PDF pagination/layout + calculation correctness + month replication behavior**.

**Scope (minimal but real):**
1) Research best practice for server-side PDF generation in FastAPI.
2) Build POC with:
   - Hardcoded plan JSON
   - Calculation engine (daily dosage → bottles needed → costs)
   - Patient PDF export with **one page per month** and **no cost fields**
   - HC PDF export including costs (optional)
3) Validate edge cases:
   - Dosage edits update bottles/costs deterministically
   - Units per bottle missing/0 handled safely
   - Long names/instructions render cleanly

**Exit criteria:**
- One-page-per-month PDF exports are stable; calculations match formula; no layout breakage.

**User stories (POC):**
1. As an HC, I can export a patient PDF where each month is a clean separate page.
2. As an HC, when I change dosage, bottle counts update immediately and correctly.
3. As an HC, I can include long instructions and they remain readable in the PDF.
4. As an Admin, I can confirm cost never appears in the patient PDF.
5. As an HC, I can preview the month sections before exporting.

**Status:** ✅ Completed
- Chosen engine: **WeasyPrint**
- POC scripts built and validated (calc correctness + pagination + no cost leakage)

---

### Phase 2 — V1 App Development (MVP; build around proven core)
**Deliverable:** Working desktop web app with the main flow fully usable.

**Backend (FastAPI + MongoDB):**
- Data models + CRUD implemented:
  - Supplements (master list; includes fridge flag, notes, defaults)
  - Templates (program, step, default months count, default supplement rows)
  - Plans (patient info, program/step, months[])
  - Users (email/password)
- Core services implemented:
  - Dosage normalization → daily_dosage (quantity * frequency/day)
  - Bottle + cost calculations per month + totals
  - Add supplement once → replicate across all months in the step
- Seed data implemented:
  - **68 real supplements** seeded
  - **9 templates** (3 programs × 3 steps) created with default month counts
  - Default demo users created:
    - admin@clarity.com / admin123
    - hc@clarity.com / hc123
- Export implemented:
  - Patient PDF export (no costs)
  - HC PDF export (with bottles + costs)
- Auth + role-based access:
  - Email/password login (JWT)
  - Admin vs HC roles
  - **Backend role-based access control enforced** for admin-only endpoints

**Frontend (React + shadcn/ui):**
- Premium minimal layout implemented (refined medical palette, table-first UX).
- Screens implemented:
  1) Login
  2) Plans dashboard (search, filter, delete)
  3) New Plan wizard (Program → Step → Months (prefilled/editable) → Patient)
  4) Plan editor (month tabs, type-ahead supplement add, per-month dosage edits, auto-calc, cost summary, export)
  5) Admin: Master supplement list (CRUD)
  6) Admin: Template editor (edit default months + add supplements)
- Key Plan editor behaviors implemented:
  - Type-ahead supplement search
  - Default auto-fill from master
  - Row add/remove
  - Replication across months in a step
  - Per-month overrides
  - Cost summary panel
  - Toggle hide/show costs

**End of phase:** Run one full E2E test pass of: seed → create plan → edit → export PDF.

**User stories (V1):**
1. As an HC, I can create a new plan from a template and set patient name/date in under a minute.
2. As an HC, I can add a supplement via search and it auto-fills dosage and instructions.
3. As an HC, when I add/remove a supplement, all months in the step stay in sync.
4. As an HC, I can override Month 2 dosage without affecting Month 1.
5. As an HC, I can export a patient PDF that excludes all costs and bottle counts.

**Status:** ✅ Completed (build) / 🟡 In progress (final E2E verification)

**Bugs found + fixed during Phase 2 testing:**
- ✅ Backend: Role-based access control was not enforced → fixed via admin-required dependencies.
- ✅ Frontend: Dashboard program filter sent "all" instead of empty string → fixed.

---

### Phase 3 — Feature Expansion + Hardening
**Goals:** Make the app production-friendly, reduce errors, improve admin experience, and close remaining workflow gaps.

**3.1 Templates (make templates truly useful day-1)**
- Populate each of the 9 templates with a meaningful default supplement set (admin-managed).
- Add template tooling:
  - Reorder supplements
  - Optional default instructions overrides per template
  - Better dosage defaults per template

**3.2 Plan lifecycle**
- Draft vs Finalized:
  - Finalize locks snapshot fields and prevents accidental edits
  - UI badges + filters
- Plan duplication:
  - Duplicate an existing plan as a starting point (returning patients)

**3.3 Historical plans + ownership**
- Associate plans with the creating HC user_id.
- Dashboard views:
  - HC sees only their plans
  - Admin can see all plans
- Filters: patient, program, status, HC

**3.4 Patient view toggle**
- “Patient View” preview toggle in Plan editor to guarantee no cost leakage visually.
- Optional patient PDF preview dialog.

**3.5 Data integrity + validation**
- Strong validations:
  - units_per_bottle > 0 when required
  - cost >= 0
  - dosage fields required for calculations
- Inline warnings for missing dosage/units.
- Keep snapshot behavior explicit:
  - Plan keeps original cost/units even if master list changes later.

**End of phase:** Full regression pass (plan creation, editing, exporting, admin editing).

**Status:** 🔜 Next

---

### Phase 4 — Authentication + Roles (complete production-grade enforcement)
**Note:** Auth is already implemented in Phase 2, but Phase 4 finalizes remaining access control and UX.

- Ensure all sensitive endpoints require auth (including plan exports).
- Confirm role rules across UI and API:
  - Admin: manage supplements/templates; view all plans
  - HC: create/edit own plans; read master supplements; use templates
- Optional:
  - Password reset flow
  - Audit logging (who edited what and when)

**End of phase:** E2E test with two users (Admin + HC) verifying access boundaries.

**Status:** 🟡 Partially complete (auth + admin-only enforcement implemented); remaining items are HC ownership scoping + full endpoint coverage.

---

## 3. Next Actions
1. **Complete Phase 2 E2E verification** (Admin and HC flows):
   - Admin: templates/supplements CRUD, create plan, export PDFs
   - HC: create/edit/export plan, confirm no admin pages visible
2. Implement **plan ownership (hc_id)** and enforce scoping rules (HC sees only their plans).
3. Implement **Draft vs Finalized** and finalize UX.
4. Implement **Plan duplication**.
5. Implement **Patient View toggle** preview mode.
6. Populate templates with default supplements (admin managed) to reduce HC editing time.

---

## 4. Success Criteria
- Core workflow: HC can create a plan from template, edit multi-month dosages, and export a branded patient PDF in <5 minutes.
- PDF export: one page per month, no cost leakage, consistent typography/layout.
- Calculations: bottles_needed and costs always match formula; totals correct per month and program.
- Data:
  - Master supplement list seeded and editable (admin)
  - Templates editable (admin)
  - Plans stored historically with ownership attribution (hc_id)
  - Snapshot data preserved for historical accuracy
- Security:
  - Role-based access enforced in API and UI
  - HC cannot access admin endpoints
- UX:
  - Fast type-ahead search
  - Clean month navigation
  - Clear patient vs internal views
