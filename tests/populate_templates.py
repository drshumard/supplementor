"""
Script to populate templates from Google Doc data.
"""
import requests
import json

API = "http://localhost:8001/api"

# Login as admin
r = requests.post(f"{API}/auth/login", json={"email":"admin@clarity.com","password":"admin123"})
token = r.json()["token"]
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# Get all supplements (fuzzy matching helper)
r = requests.get(f"{API}/supplements?limit=200&active_only=false", headers=headers)
all_supps = r.json()["supplements"]
supp_map = {s["supplement_name"]: s for s in all_supps}

# Fuzzy match helper
def find_supp(name):
    """Find supplement by name with fuzzy matching."""
    # Exact match
    if name in supp_map:
        return supp_map[name]
    # Case-insensitive
    for k, v in supp_map.items():
        if k.lower() == name.lower():
            return v
    # Partial match
    name_lower = name.lower()
    for k, v in supp_map.items():
        if name_lower in k.lower() or k.lower() in name_lower:
            return v
    print(f"  WARNING: Could not find supplement: {name}")
    return None

def make_entry(name, qty, freq, dosage_display, instructions="With food", refrigerate=None):
    """Create a template supplement entry."""
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

def update_template(program, step, default_months, supps):
    tmpl = find_template(program, step)
    if not tmpl:
        print(f"  ERROR: Template {program} Step {step} not found!")
        return
    entries = [e for e in supps if e is not None]
    r = requests.put(f"{API}/templates/{tmpl['_id']}", headers=headers, json={
        "default_months": default_months,
        "supplements": entries
    })
    result = r.json()
    print(f"  Updated {program} Step {step}: {len(entries)} supplements, {default_months} months")
    return result


# ═══════════════════════════════════════════════════════════════════
# DETOX 1, STEP 2 (from Doc 4) - 4 months
# Month 1 base supplements (dosages vary per month, but template = month 1 defaults)
# ═══════════════════════════════════════════════════════════════════
print("\n=== Detox 1, Step 2 ===")
d1s2_supps = [
    make_entry("Advanced Tudca", 2, 2, "2 caps 2x/day", "With food"),
    make_entry("VIRADCHEM Binder", 3, 2, "3 caps 2x/day", "With food"),
    make_entry("Biotoxin Binder", 2, 2, "2 caps 2x/day", "With food"),
    make_entry("HM-ET Binder", 2, 2, "2 caps 2x/day", "With food"),
    make_entry("Drainage Activator", 2, 2, "2 caps 2x/day", "With food"),
    make_entry("Nanoemulsified Vitamin D3-K2", 3, 1, "3 pumps/day", "With food"),
    make_entry("KL Support", 2, 2, "2 caps 2x/day", "With food"),
    make_entry("CT Minerals", 1, 1, "1 cap/day", "With food (Afternoon)"),
    make_entry("Omegagenics EPA-DHA 720 Lemon", 2, 1, "2 caps/day", "With food. Refrigerate.", True),
    make_entry("Bowel Mover", 1, 1, "1 cap at dinner", "With dinner"),
    make_entry("Carboxy", 1, 1, "1 scoop in H2O", "30 min before bed, without food"),
]
update_template("Detox 1", 2, 4, d1s2_supps)


# ═══════════════════════════════════════════════════════════════════
# DETOX 1, STEP 3 (from Doc 5) - 2 months
# ═══════════════════════════════════════════════════════════════════
print("\n=== Detox 1, Step 3 ===")
d1s3_supps = [
    make_entry("NAD+Gold", 2, 2, "2 pumps 2x/day", "10 min before eating. Refrigerate.", True),
    make_entry("Liposomal Glutathione", 2, 2, "2 pumps 2x/day", "10 min before eating. Refrigerate.", True),
    make_entry("Liposomal Methyl B-12", 2, 2, "2 pumps 2x/day", "10 min before eating"),
    make_entry("Clearvite PSF", 1, 1, "1 scoop in H2O or nut milk", "With food (AM). Combo with Repairvite."),
    make_entry("Repairvite Original K60", 1, 1, "1 scoop", "With food (AM). Combo with Clearvite."),
    make_entry("Glucostatic Balance", 2, 3, "2 caps 3x/day", "With food"),
    make_entry("Effecsulin", 2, 3, "2 caps 3x/day", "With food"),
    make_entry("Adaptocrine", 1, 3, "1 cap 3x/day", "With food"),
    make_entry("Omegagenics EPA-DHA 720 Lemon", 2, 1, "2 caps/day", "With food (AM). Refrigerate.", True),
    make_entry("Nanoemulsified Vitamin D3-K2", 3, 1, "3 pumps/day", "With food (AM)"),
    make_entry("Seed", 1, 1, "1 cap/day", "With food (PM). Probiotic."),
    make_entry("Carboxy", 1, 1, "1 scoop in H2O", "30 min before bed, without food"),
]
update_template("Detox 1", 3, 2, d1s3_supps)


# ═══════════════════════════════════════════════════════════════════
# DETOX 2, STEP 1 (from Doc 2) - 1 month (2-week clearing variant)
# Same supplements as Detox 1 Step 1 but 2-week focused
# ═══════════════════════════════════════════════════════════════════
print("\n=== Detox 2, Step 1 ===")
d2s1_supps = [
    make_entry("Clearvite PSF", 1, 2, "1 scoop 2x/day (AM + PM)", "With food. 1 scoop in 8oz H2O or nut milk."),
    make_entry("Bilemin", 2, 3, "2 caps 3x/day", "With food"),
    make_entry("Methyl-SP", 2, 3, "2 caps 3x/day", "With food"),
    make_entry("Metacrin-DX", 2, 3, "2 caps 3x/day", "With food"),
    make_entry("Liposomal Glutathione", 2, 2, "2 pumps 2x/day", "With food. Refrigerate.", True),
]
update_template("Detox 2", 1, 1, d2s1_supps)


# ═══════════════════════════════════════════════════════════════════
# MAINTENANCE, STEP 1 (from Doc 3) - 6 months
# ═══════════════════════════════════════════════════════════════════
print("\n=== Maintenance, Step 1 ===")
m1_supps = [
    make_entry("Berberine-X", 1, 1, "1 cap/day", "With food (Morning)"),
    make_entry("Hypaxx Balance", 1, 3, "1 cap 3x/day", "With food"),
    make_entry("Nanoemulsified Vitamin D3-K2", 3, 1, "3 pumps/day", "With food (Morning)"),
    make_entry("Liposomal Glutathione", 2, 2, "2 pumps 2x/day", "With food. Refrigerate.", True),
    make_entry("Omegagenics EPA-DHA 720 Lemon", 2, 1, "2 caps/day", "With food (Afternoon). Refrigerate.", True),
]
update_template("Maintenance", 1, 6, m1_supps)


print("\n" + "=" * 60)
print("All templates populated successfully!")
print("=" * 60)

# Summary
r = requests.get(f"{API}/templates", headers=headers)
for t in r.json()["templates"]:
    count = len(t.get("supplements", []))
    print(f"  {t['program_name']} Step {t['step_number']}: {count} supplements, {t.get('default_months', '?')} months")
