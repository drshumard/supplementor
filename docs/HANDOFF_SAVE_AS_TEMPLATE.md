# Feature Handoff: Save Plan as Template

## Summary

Added ability for admins to save any patient's plan as a reusable protocol template, either creating a new template or overwriting an existing one.

---

## Files Changed

### Backend

**`/app/backend/server.py`** — Added endpoint `POST /api/templates/save-from-plan`

- **Location:** After `create_template` endpoint (~line 695)
- **Auth:** `require_admin` — only admins can save templates
- **Request body:**
  ```python
  class SaveAsTemplateRequest(PydanticBaseModel):
      plan_id: str
      mode: str = "new"           # "new" or "overwrite"
      program_name: str = ""      # Required when mode="new"
      step_number: int = 1        # Required when mode="new"
      template_id: str = ""       # Required when mode="overwrite"
  ```
- **Logic:**
  1. Fetches the plan by ID from MongoDB
  2. Iterates plan's `months` array, extracts supplement data (strips patient-specific fields like `bottles_needed`, `calculated_cost`, `hc_notes`)
  3. If mode="new": creates a new template document with `program_name`, `step_number`, `months`, and `supplements` (flat copy of month 1 for backward compat)
  4. If mode="overwrite": updates existing template's `months`, `supplements`, and `default_months` fields
  5. Returns success message + template document

- **Data preserved in template:** `supplement_id`, `supplement_name`, `company`, `supplier`, `unit_type`, `quantity_per_dose`, `frequency_per_day`, `dosage_display`, `instructions`, `units_per_bottle`, `cost_per_bottle`, `refrigerate`, `times`
- **Data stripped:** `bottles_needed`, `calculated_cost`, `hc_notes`, `with_food`

### Frontend

**`/app/frontend/src/lib/api.js`** — Added API function

```javascript
export const savePlanAsTemplate = (data) =>
  request('/templates/save-from-plan', { method: 'POST', body: JSON.stringify(data) });
```

**`/app/frontend/src/pages/PlanEditorPage.jsx`** — Added UI

1. **Import added:** `getTemplates`, `savePlanAsTemplate` from api.js, `Layers` icon from lucide-react

2. **State (around line 590):**
   ```javascript
   const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
   const [saveTemplateMode, setSaveTemplateMode] = useState('new');
   const [saveTemplateName, setSaveTemplateName] = useState('');
   const [saveTemplateStep, setSaveTemplateStep] = useState(1);
   const [saveTemplateId, setSaveTemplateId] = useState('');
   const [templatesList, setTemplatesList] = useState([]);
   const [savingTemplate, setSavingTemplate] = useState(false);
   ```

3. **Handler `openSaveTemplate`:**
   - Pre-fills program name + step from current plan
   - Fetches all templates for the "overwrite" dropdown
   - Opens the dialog

4. **Handler `handleSaveTemplate`:**
   - Builds request body based on mode (new vs overwrite)
   - Calls `savePlanAsTemplate` API
   - Shows success toast with message from backend
   - Closes dialog

5. **Menu item:** In the `DropdownMenu` (Actions), added after "Duplicate Plan":
   ```jsx
   <DropdownMenuItem onClick={openSaveTemplate}>
     <Layers size={14} className="mr-2" /> Save as Template
   </DropdownMenuItem>
   ```

6. **Dialog:** `<Dialog>` with:
   - Mode selector (Create new / Overwrite existing)
   - Conditional fields: program name + step number for "new", template dropdown for "overwrite"
   - Submit button disabled until required fields are filled
   - Loading state while saving

---

## User Flow

1. Admin opens any patient plan
2. Clicks "Actions" dropdown → "Save as Template"
3. Dialog opens with plan's program/step pre-filled
4. Chooses "Create new template" or "Overwrite existing"
5. Clicks "Save Template"
6. Toast confirms success
7. Template is now available in the Templates page and New Plan wizard

---

## Edge Cases Handled

- **Empty plan (no months):** Creates template with empty supplements array
- **Overwrite non-existent template:** Returns 404
- **No program name on "new":** Returns 400 validation error
- **Non-admin user:** Returns 403 (endpoint uses `require_admin`)
- **Multi-month plans:** All months preserved with their individual supplement lists

---

## Testing Checklist

- [ ] Create plan with 3 months, different supplements per month → Save as new template → Verify template has all 3 months
- [ ] Save as template → Overwrite existing → Verify old template data is replaced
- [ ] Non-admin user → Verify "Save as Template" menu item doesn't appear (actually it does appear but API returns 403 — may want to conditionally hide based on role)
- [ ] Template saved → Create new plan from that template → Verify months/supplements match
- [ ] Overwrite template that's currently being viewed in Templates page → Verify data refreshes

---

## Known Limitations

- The "Save as Template" button appears for all authenticated users in the dropdown, but only admins can execute it (API enforces). Consider hiding the menu item for non-admin users.
- `with_food` field is not preserved in the template (stripped during save). Plans created from this template will default `with_food: true`.
- If the plan has modified costs (from rolling surplus), those calculated values are stripped — templates always use fresh calculations when plans are created from them.
