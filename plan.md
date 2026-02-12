# plan.md

## 1. Objectives
- Replace the clinic’s Google Docs supplement protocol workflow with a fast, error-resistant **desktop web app**.
- Deliver a premium **Apple/Jony Ive–inspired** UI optimized for HC throughput (table-first, minimal cognitive overhead) with **spacious layouts**, **high scan-ability**, and **clear visual hierarchy**.
- Provide a “burst of color” UI system that makes state/actions instantly legible:
  - **Orange** for primary creation/export actions
  - **Black** for secondary actions
  - **Teal** for Save
  - **Amber/Yellow** for Finalize / warnings
  - **Red** for destructive actions
  - Warm tinted **card/section backgrounds** for grouping and hierarchy
- Automate **bottles needed** and **cost totals** for internal HC use, while guaranteeing **no cost leakage** in patient-facing views/exports.
- Provide admin tooling for a centralized, updatable **Master Supplement List** and **Protocol Templates**.
- Maintain historical accuracy by **snapshotting supplement data into plans** at the time plans are created/edited.
- Enforce **role-based access control** (Admin vs HC) and ensure HCs only access their own plans.

**Status (current):** ✅ Application is fully built, feature-complete through Phase 3. ✅ **Phase 5 (P0 Visual Overhaul) is completed** with warm colorful accent treatment across the app. ✅ Regression testing passed at **100%**.

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
- UI navigation reflects role:
  - HC nav: Dashboard + New Plan only
  - Admin nav: includes Supplements + Templates

**Status:** ✅ Completed

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

### Phase 5 — P0 Visual Overhaul (premium spacious UI + color hierarchy + Plan Editor redesign)
**Why:** Ensure the app feels premium, modern, high-throughput, and visually intuitive; match provided inspiration with warm tinted cards and color-coded actions.

**Scope (P0):**
- Verify frontend compilation and UI integrity after design changes.
- Apply consistent spacing/typography and introduce strong visual hierarchy via warm tints and action colors.
- Update all key pages:
  - Login
  - Dashboard
  - New Plan Wizard
  - Plan Editor
  - Admin Supplements
  - Admin Templates

**Major Plan Editor redesign (production-ready):**
- Converted Month supplement list from shadcn `<Table>` to a **CSS grid-based layout**.
- Increased row height/whitespace for scan-ability.
- Adjusted alignment per latest feedback:
  - **Columns are left-aligned** for readability (matching inspo).
- Patient header improvements:
  - **Large centered patient name** with centered metadata line.
- Warm tinted sectioning:
  - Month headers use warm amber-tinted background.
  - Cost summary panel uses warm cream tint + green total.

**Global color/action system implemented:**
- Orange: primary CTA (New Plan, Patient PDF export, Add-to-all, etc.)
- Black: secondary actions (e.g., HC PDF, Add Month)
- Teal: Save
- Amber: Finalize / locked states
- Red: delete/destructive confirmations
- Warm tinted cards/sections used across Dashboard, Templates, Plan Editor, Supplements

**Operational fix included:**
- Backend startup issue discovered (WeasyPrint dependency) and resolved (installed missing system libs).

**Exit criteria:**
- No layout regressions across core pages.
- Visual hierarchy is obvious (burst of color) and production-ready.
- App compiles cleanly.
- Regression testing run with no critical failures.

**Status:** ✅ Completed
- Screenshots captured for key pages (Dashboard, Plan Editor, Supplements, Templates).
- Regression testing passed at **100% overall** (Iteration 5).

---

## 3. Next Actions
Application is feature-complete and UI polish is complete. Remaining work is primarily **clinic data completion** + **final verification**.

### P0/P1 Operational Data Tasks (clinic-provided inputs)
1. **Populate remaining templates** with clinic-default supplement lists (notably: Maintenance Step 2 and Maintenance Step 3).
2. **Correct supplement pricing gaps** (e.g., BC-ATP showing $0.00) once clinic confirms exact values.

### P1 Verification / Hardening
3. **PDF export verification pass**
   - Reconfirm multi-month exports are one page per month for both patient and HC PDFs.
   - Spot-check long instructions/wrapping and ensure no cost leakage.

### Optional QoL Enhancements (P2)
4. Reordering supplements within a plan/template.
5. More explicit snapshot rules (locking master fields on finalize).
6. Optional audit trail (who edited what/when).
7. Password reset flow.

### Production Readiness (P2)
8. Configure JWT secret via environment.
9. Backup strategy for MongoDB.
10. Performance pass on large plans (many months × many supplements).

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
  - Warm tinted cards/sections and colorful action system improves clarity
  - Plan Editor is production-ready with large centered patient header, left-aligned columns, and clear separation of internal vs patient views
