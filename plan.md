# plan.md

## 1. Objectives
- Replace the clinic’s Google Docs supplement protocol workflow with a fast, error-resistant **desktop web app**.
- Deliver a premium **Apple/Jony Ive–inspired** UI optimized for HC throughput (table-first, minimal cognitive overhead) with **spacious layouts** and **high scan-ability**.
- Automate **bottles needed** and **cost totals** for internal HC use, while guaranteeing **no cost leakage** in patient-facing views/exports.
- Provide admin tooling for a centralized, updatable **Master Supplement List** and **Protocol Templates**.
- Maintain historical accuracy by **snapshotting supplement data into plans** at the time plans are created/edited.
- Enforce **role-based access control** (Admin vs HC) and ensure HCs only access their own plans.
- **P0 Polish:** Apply and verify the “premium, spacious” visual system across all pages, with Plan Editor redesigned to match provided inspiration.

**Status (current):** ✅ Application is fully built, feature-complete through Phase 3 **and P0 Visual Overhaul is completed**. Regression testing passed (≈95% overall) with **no critical bugs**.

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
  - **68+ real supplements** (seed list)
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
  4) Plan Editor (multi-month, supplement add, dosage overrides, auto-calculations)
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

### Phase 5 — P0 Visual Overhaul (premium spacious UI + Plan Editor redesign)
**Why:** Ensure the app feels premium, modern, and high-throughput for HC use; match provided inspiration with spacious, centered, highly scannable tables.

**Scope (P0):**
- Verify frontend compilation and UI integrity after design changes.
- Apply the refined medical palette, typography, and spacing tokens consistently.
- Update all key pages to a “premium internal tool” aesthetic:
  - Login
  - Dashboard
  - New Plan Wizard
  - Plan Editor
  - Admin Supplements
  - Admin Templates
- **Major Plan Editor redesign:**
  - Converted Month supplement list from shadcn `<Table>` to a **CSS grid-based layout**
  - **Ultra-spacious row height** (large vertical padding)
  - **Centered column alignment** for numeric and text fields (qty/freq/dosage/instructions/bottles/cost)
  - Clear, calm sectioning per month with generous whitespace
- Validate role-based UI states remain correct (HC vs Admin, Patient View toggle).

**Exit criteria:**
- No layout regressions across core pages.
- Plan Editor matches inspo: spacious rows, centered columns, subtle separators.
- App compiles cleanly.
- Regression testing run with no critical failures.

**Status:** ✅ Completed
- Backend startup issue discovered (WeasyPrint system dependency) and resolved.
- Screenshots taken for key pages (Login, Dashboard, Templates, Plan Editor).
- Regression testing passed at ~95% overall; only minor test-timeout detection issue on save state.

---

## 3. Next Actions
Since the application is feature-complete and P0 UI overhaul is complete, next steps are operational + data finishing + optional enhancements:

### P0/P1 Operational Data Tasks (clinic-provided inputs)
1. **Populate remaining templates** with clinic-default supplement lists (notably: Maintenance Step 2 and Maintenance Step 3) to reduce HC editing time.
2. **Correct supplement pricing gaps** (e.g., BC-ATP showing $0.00) once clinic confirms exact values.

### P1 Verification / Hardening
3. **PDF export verification pass**
   - Reconfirm multi-month exports are one page per month for both patient and HC PDFs.
   - Spot-check long instructions/wrapping with new Plan Editor editing patterns.
4. **Address minor test flake**
   - Improve save-state detection in automation (functional behavior is correct; reduce false negatives).

### Optional QoL Enhancements (P2)
5. Reordering supplements within a plan/template.
6. More explicit snapshot rules (locking master fields on finalize).
7. Optional audit trail (who edited what/when).
8. Password reset flow.

### Production Readiness (P2)
9. Configure JWT secret via environment.
10. Backup strategy for MongoDB.
11. Performance pass on large plans (many months × many supplements).

---

## 4. Success Criteria
✅ Met for V1 + P0 UI:
- Core workflow: HC can create a plan from template, edit multi-month dosages, and export a branded patient PDF quickly.
- PDF export: one page per month, consistent layout, **no cost leakage**.
- Calculations: bottles + costs always match formula; totals correct.
- Data:
  - Master supplement list seeded and admin-editable
  - Templates exist (9) and are admin-editable
  - Plans stored historically with ownership attribution
- Security:
  - Role-based access enforced in API and UI
  - HC cannot access admin endpoints
  - HC sees only their plans
- UX/UI:
  - Premium, spacious Apple-inspired layout across all pages
  - Plan Editor matches inspiration: centered columns, generous whitespace, subtle separators
  - Fast type-ahead search and clear separation of internal vs patient views
