# Save Plan as Template

## Goal
Let an admin save a patient's plan as a reusable protocol template — either as a **new** template or by **overwriting** an existing one.

## User flow
1. Open a plan in `PlanEditorPage`
2. Actions dropdown → **Save as Template**
3. Dialog with two modes:
   - **Create new** — program name + step pre-filled from the current plan, editable
   - **Overwrite existing** — pick from dropdown of all templates
4. Save → toast confirms, dialog closes

## Backend — `backend/server.py`

New endpoint after `delete_template`:

```
POST /api/templates/save-from-plan   (require_admin)
```

Request:
```python
class SaveAsTemplateRequest(PydanticBaseModel):
    plan_id: str
    mode: str = "new"          # "new" | "overwrite"
    program_name: str = ""     # required when mode="new"
    step_number: int = 1       # required when mode="new"
    template_id: str = ""      # required when mode="overwrite"
```

Logic:
- Load plan by `plan_id` (404 if missing).
- For each `plan.months[].supplements[]`, copy only template-shaped fields: `supplement_id`, `supplement_name`, `company`, `supplier`, `unit_type`, `quantity_per_dose`, `frequency_per_day`, `dosage_display`, `instructions`, `units_per_bottle`, `cost_per_bottle`, `refrigerate`, `times`. Drop patient-specific fields (`bottles_needed`, `calculated_cost`, `hc_notes`).
- `mode="new"`: insert with `program_name`, `step_number`, `step_label=f"Step {n}"`, `default_months=len(months)`, `months`, `supplements=months[0].supplements` (back-compat), timestamps. 400 if `program_name` empty.
- `mode="overwrite"`: 404 if template missing; update `months`, `supplements` (flat copy of month 1), `default_months`, `updated_at`.
- Return `{ "message": str, "template": serialized_doc }`.

## Frontend

**`frontend/src/lib/api.js`** — add:
```js
export const savePlanAsTemplate = (data) =>
  request('/templates/save-from-plan', { method: 'POST', body: JSON.stringify(data) });
```

**`frontend/src/pages/PlanEditorPage.jsx`** — add:
- Imports: `getTemplates`, `savePlanAsTemplate`, `Layers` icon
- "Save as Template" `DropdownMenuItem` after "Duplicate Plan" — **hide for non-admins** (check `useAuth().user.role`, don't rely on the 403 alone)
- Dialog matching the page's existing dialog style (use the Duplicate dialog as reference)
- On open: pre-fill program/step from current plan, fetch templates for overwrite dropdown
- On save: call API, toast message, close

## Acceptance
- [ ] 3-month plan saved as new → template has all 3 months with correct supplements
- [ ] Overwrite existing → old template data fully replaced
- [ ] Non-admin user does not see the menu item
- [ ] "New" with empty program name → save button disabled
- [ ] New plan created from saved template → supplements match

## Out of scope
- `with_food` is intentionally not carried over — templates fall back to the supplement default.
- Calculated cost / rolling-surplus values are stripped; templates recompute fresh on plan creation.
