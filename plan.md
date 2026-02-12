# plan.md

## 1. Objectives
- Replace Google Docs supplement protocol workflow with a fast, error-resistant web app for HCs.
- Prove the **core workflow** end-to-end: template → multi-month editing → auto bottle/cost calculations → clean **patient PDF export (no costs)**.
- Deliver V1 with admin-managed master supplements + templates, historical patient plans, premium minimal UI, and role-based auth.

---

## 2. Implementation Steps (Phased)

### Phase 1 — Core Flow POC (isolation; do not proceed until solid)
**Why:** The highest risk is **PDF pagination/layout + calculation correctness + month replication behavior**.

**Scope (minimal but real):**
1) **Web research**: best practice for React/Node-less PDF generation from FastAPI (e.g., WeasyPrint vs ReportLab) + page-per-month layout patterns.
2) Build a small FastAPI POC with:
   - A hardcoded plan JSON (1 step, 3 months, 5 supplements)
   - Calculation function: daily_dosage → bottles_needed + costs
   - Generate **patient PDF** with branding header and **one page per month** (no cost fields)
   - Generate **HC PDF** or HTML preview (with costs) (optional for POC)
3) Validate with edge cases:
   - Dosage changes update bottles/costs deterministically
   - Units per bottle missing/0 handled safely (validation error)
   - Long supplement names + instructions don’t overflow (wrap/truncate)

**Exit criteria:**
- PDF exports consistently as one-page-per-month across test data; calculations match formula; no layout breakage.

**User stories (POC):**
1. As an HC, I can export a patient PDF where each month is a clean separate page.
2. As an HC, when I change dosage, bottle counts update immediately and correctly.
3. As an HC, I can include long instructions and they remain readable in the PDF.
4. As an Admin, I can confirm cost never appears in the patient PDF.
5. As an HC, I can preview the month sections before exporting.

---

### Phase 2 — V1 App Development (MVP; build around proven core)
**Deliverable:** Working desktop web app with the main flow fully usable.

**Backend (FastAPI + MongoDB):**
- Data models + CRUD:
  - Supplements (master list; includes fridge flag, notes, defaults)
  - Templates (program, step, default months count, default supplement rows)
  - Plans (patient info, program/step, months[], snapshot supplement info at add-time)
- Core services:
  - Dosage normalization → daily_dosage (quantity * frequency_per_day)
  - Bottle + cost calculations per month + totals
  - “Add supplement once” → replicate to all months in the step
- Seed script:
  - Import the provided ~70 supplements into MongoDB
  - Seed 9 templates with default month counts (Step1=1, Step2=4, Step3=2) and placeholder supplement sets (admin-editable)
- API endpoints (minimal set):
  - Auth-less first pass (if needed for speed), then add auth in Phase 4
  - /supplements (list/search)
  - /templates (list/get)
  - /plans (create/update/get/list)
  - /plans/{id}/export/patient.pdf
  - /plans/{id}/export/hc.pdf (optional)

**Frontend (React + shadcn/ui):**
- Premium minimal layout (white space, subtle borders, refined medical palette).
- Screens:
  1) Plans dashboard (recent plans, create new)
  2) New plan wizard (select Program → Step → months prefilled but editable)
  3) Plan editor (month tabs/sections; table editor; calculated summaries)
  4) Admin: master supplements + template editor
- Plan editor behaviors:
  - Type-ahead supplement search, selecting fills defaults
  - Add/remove rows; add once replicates across months
  - Dosage editor: quantity + frequency/day fields; per-month overrides
  - Instructions: with/without food toggle + free text
  - Internal cost/bottle summaries visible in editor; patient preview hides cost
  - Export PDF buttons

**End of phase:** Run one full E2E test pass of: seed → create plan → edit → export PDF.

**User stories (V1):**
1. As an HC, I can create a new plan from a template and set patient name/date in under a minute.
2. As an HC, I can add a supplement via search and it auto-fills dosage and instructions.
3. As an HC, when I add/remove a supplement, all months in the step stay in sync.
4. As an HC, I can override Month 2 dosage without affecting Month 1.
5. As an HC, I can export a patient PDF that excludes all costs and bottle counts.

---

### Phase 3 — Feature Expansion + Hardening
**Goals:** Make the app production-friendly, reduce errors, improve admin experience.

- Template editor improvements:
  - Per-template month defaults + default supplement list management
  - “Set for all months” vs “override per month” controls
- Data integrity:
  - Strong validations (units_per_bottle > 0, cost >= 0, dosage fields required)
  - Snapshot rules: when supplement added to a plan, store name/company/units/cost at that time
- UX improvements:
  - Inline warnings for incomplete dosage or missing units
  - “Patient View” toggle to preview exactly what patient sees
  - Faster search + keyboard navigation (Enter to add)
- Plan lifecycle:
  - Draft vs Finalized (finalized locks snapshot fields)
  - Historical plans list + filtering (by patient, program, HC)

**End of phase:** One full E2E regression test pass.

**User stories (expansion):**
1. As an Admin, I can update a supplement price and it affects only new plans.
2. As an HC, I can mark a plan finalized so it can’t be accidentally changed.
3. As an HC, I can duplicate a prior plan for a returning patient.
4. As an Admin, I can edit templates so HCs start closer to the final protocol.
5. As an HC, I can switch to Patient View to confirm cost is hidden everywhere.

---

### Phase 4 — Authentication + Roles (email/password, role-based access)
- Implement JWT auth (login/register/forgot optional) with roles:
  - Admin: full access (supplements, templates, all plans)
  - HC: manage own plans; read master supplements; use templates
- Associate plans with HC user_id.
- Protect exports and plan endpoints.

**End of phase:** One full E2E test pass with two accounts (Admin + HC).

**User stories (auth):**
1. As an HC, I can log in and see only my plans.
2. As an Admin, I can manage the master supplement list safely.
3. As an Admin, I can manage templates without affecting existing finalized plans.
4. As an HC, I can export PDFs only for plans I created.
5. As an HC, I can log out and know patient data is protected.

---

## 3. Next Actions
1. Choose the PDF engine for FastAPI (based on Phase 1 research) and implement the PDF POC.
2. Convert the provided supplement table into a clean seed JSON/CSV and build the MongoDB seed.
3. Implement minimal plan JSON schema + calculation service + tests.
4. Build V1 UI shells (dashboard, plan editor) and wire to API.
5. Run E2E: create plan → edit months → export patient PDF.

---

## 4. Success Criteria
- Core workflow: HC can create a plan from template, edit multi-month dosages, and export a branded patient PDF in <5 minutes.
- PDF export: one page per month, no cost leakage, consistent typography/layout.
- Calculations: bottles_needed and costs always match formula; totals correct per month and program.
- Data: master supplements seeded; templates editable; plans stored historically with HC association.
- UX: fast type-ahead search, keyboard-friendly row add, clear patient vs internal views.
