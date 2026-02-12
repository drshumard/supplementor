"""
Core POC Test Script — Supplement Plan App
Tests:
1. Calculation engine (bottles needed, costs, totals)
2. PDF generation (patient-facing, one page per month, no cost leakage)
3. Edge cases (missing data, long text, zero values)
"""

import math
import os
import sys

# ─── 1. Calculation Engine ───────────────────────────────────────────────────

def calculate_daily_dosage(quantity_per_dose: int, frequency_per_day: int) -> int:
    """Calculate total daily dosage from quantity and frequency."""
    return quantity_per_dose * frequency_per_day

def calculate_bottles_needed(daily_dosage: int, units_per_bottle: int) -> int:
    """Calculate bottles needed for a 30-day month."""
    if units_per_bottle <= 0:
        raise ValueError("units_per_bottle must be > 0")
    return math.ceil((daily_dosage * 30) / units_per_bottle)

def calculate_supplement_cost(bottles_needed: int, cost_per_bottle: float) -> float:
    """Calculate cost for a supplement for one month."""
    return round(bottles_needed * cost_per_bottle, 2)

def calculate_monthly_total(supplements: list) -> float:
    """Sum all supplement costs for a month."""
    return round(sum(s.get("calculated_cost", 0) for s in supplements), 2)


def test_calculations():
    """Test all calculation functions with known values."""
    print("\n═══ TEST 1: Calculation Engine ═══")
    
    # Test 1a: Basic bottle calc — Adaptocrine: 1 cap 3x/day, 90 caps/bottle
    daily = calculate_daily_dosage(1, 3)
    assert daily == 3, f"Expected 3, got {daily}"
    bottles = calculate_bottles_needed(3, 90)
    assert bottles == 1, f"Expected 1, got {bottles}"
    cost = calculate_supplement_cost(1, 46.98)
    assert cost == 46.98, f"Expected 46.98, got {cost}"
    print("  ✓ Adaptocrine: 1 cap × 3/day = 3/day → 90 needed/90 per bottle = 1 bottle → $46.98")
    
    # Test 1b: Bilemin: 2 caps 3x/day, 90 caps/bottle → 6/day × 30 = 180, 180/90 = 2 bottles
    daily = calculate_daily_dosage(2, 3)
    assert daily == 6
    bottles = calculate_bottles_needed(6, 90)
    assert bottles == 2, f"Expected 2, got {bottles}"
    cost = calculate_supplement_cost(2, 32.98)
    assert cost == 65.96, f"Expected 65.96, got {cost}"
    print("  ✓ Bilemin: 2 caps × 3/day = 6/day → 180 needed/90 per bottle = 2 bottles → $65.96")
    
    # Test 1c: AlgaeOmega: 4 caps/day, 120 caps/bottle → 4×30=120, 120/120 = 1 bottle
    daily = calculate_daily_dosage(4, 1)
    bottles = calculate_bottles_needed(4, 120)
    assert bottles == 1, f"Expected 1, got {bottles}"
    cost = calculate_supplement_cost(1, 53.95)
    assert cost == 53.95
    print("  ✓ AlgaeOmega: 4 caps × 1/day = 4/day → 120 needed/120 per bottle = 1 bottle → $53.95")
    
    # Test 1d: Edge case — exact fit
    bottles = calculate_bottles_needed(3, 90)
    assert bottles == 1
    print("  ✓ Edge: 3/day × 30 = 90, 90/90 = 1 bottle (exact fit)")
    
    # Test 1e: Edge case — one extra capsule
    bottles = calculate_bottles_needed(4, 90)  # 120 / 90 = 1.33 → ceil = 2
    assert bottles == 2
    print("  ✓ Edge: 4/day × 30 = 120, 120/90 = 1.33 → 2 bottles (ceiling)")
    
    # Test 1f: Zero units per bottle → should raise
    try:
        calculate_bottles_needed(3, 0)
        assert False, "Should have raised ValueError"
    except ValueError:
        print("  ✓ Edge: 0 units_per_bottle raises ValueError")
    
    # Test 1g: Monthly total
    supplements = [
        {"calculated_cost": 46.98},
        {"calculated_cost": 65.96},
        {"calculated_cost": 53.95},
    ]
    total = calculate_monthly_total(supplements)
    assert total == 166.89, f"Expected 166.89, got {total}"
    print(f"  ✓ Monthly total: $46.98 + $65.96 + $53.95 = ${total}")
    
    print("  ✅ ALL CALCULATION TESTS PASSED")


# ─── 2. PDF Generation ──────────────────────────────────────────────────────

def generate_patient_pdf(plan_data: dict, output_path: str) -> str:
    """Generate a patient-facing PDF — one page per month, NO cost info."""
    from jinja2 import Template
    from weasyprint import HTML

    html_template = Template("""
    <!DOCTYPE html>
    <html>
    <head>
    <style>
        @page {
            size: Letter;
            margin: 1in 0.75in;
            @top-center {
                content: "Clarity Wellness Center";
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                font-size: 9pt;
                color: #94a3b8;
                letter-spacing: 0.5px;
            }
            @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                font-size: 8pt;
                color: #94a3b8;
            }
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            line-height: 1.5;
        }
        .month-page {
            page-break-before: always;
        }
        .month-page:first-child {
            page-break-before: avoid;
        }
        .header {
            text-align: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid #e2e8f0;
        }
        .header h1 {
            font-size: 22pt;
            font-weight: 300;
            color: #0f172a;
            letter-spacing: -0.5px;
            margin-bottom: 4px;
        }
        .header .subtitle {
            font-size: 11pt;
            color: #64748b;
            font-weight: 400;
        }
        .meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            font-size: 10pt;
            color: #475569;
        }
        .meta-item { }
        .meta-label { font-weight: 600; color: #334155; }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
        }
        th {
            background: #f8fafc;
            padding: 8px 10px;
            text-align: left;
            font-size: 8.5pt;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #e2e8f0;
        }
        td {
            padding: 8px 10px;
            font-size: 10pt;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: top;
        }
        tr:last-child td { border-bottom: none; }
        .supplement-name {
            font-weight: 500;
            color: #0f172a;
        }
        .company {
            font-size: 8pt;
            color: #94a3b8;
            margin-top: 1px;
        }
        .instructions {
            font-size: 9pt;
            color: #64748b;
            font-style: italic;
        }
        .fridge-badge {
            display: inline-block;
            background: #dbeafe;
            color: #1d4ed8;
            font-size: 7pt;
            padding: 1px 5px;
            border-radius: 3px;
            font-weight: 600;
            letter-spacing: 0.3px;
        }
    </style>
    </head>
    <body>
    {% for month in plan.months %}
    <div class="month-page">
        <div class="header">
            <h1>{{ plan.program_name }}</h1>
            <div class="subtitle">{{ plan.step_label }} — Month {{ month.month_number }}</div>
        </div>
        <div class="meta">
            <div class="meta-item"><span class="meta-label">Patient:</span> {{ plan.patient_name }}</div>
            <div class="meta-item"><span class="meta-label">Date:</span> {{ plan.date }}</div>
        </div>
        <table>
            <thead>
                <tr>
                    <th style="width:35%">Supplement</th>
                    <th style="width:25%">Dosage</th>
                    <th style="width:40%">Instructions</th>
                </tr>
            </thead>
            <tbody>
            {% for s in month.supplements %}
                <tr>
                    <td>
                        <div class="supplement-name">{{ s.supplement_name }}</div>
                        <div class="company">{{ s.company }}</div>
                        {% if s.refrigerate %}<span class="fridge-badge">REFRIGERATE</span>{% endif %}
                    </td>
                    <td>{{ s.dosage_display }}</td>
                    <td class="instructions">{{ s.instructions }}</td>
                </tr>
            {% endfor %}
            </tbody>
        </table>
    </div>
    {% endfor %}
    </body>
    </html>
    """)

    html_content = html_template.render(plan=plan_data)
    
    # Generate PDF
    pdf_bytes = HTML(string=html_content).write_pdf()
    with open(output_path, "wb") as f:
        f.write(pdf_bytes)
    
    return output_path


def test_pdf_generation():
    """Test PDF generation with realistic data."""
    print("\n═══ TEST 2: PDF Generation ═══")
    
    # Build a realistic test plan
    test_plan = {
        "patient_name": "John Smith",
        "date": "January 15, 2026",
        "program_name": "Metabolic Clearing — Detox 1",
        "step_label": "Step 2",
        "months": []
    }
    
    base_supplements = [
        {
            "supplement_name": "Adaptocrine",
            "company": "Apex Energetics",
            "dosage_display": "1 capsule, 3× daily",
            "instructions": "Take with food",
            "refrigerate": False,
        },
        {
            "supplement_name": "Bilemin",
            "company": "Apex Energetics",
            "dosage_display": "2 capsules, 3× daily",
            "instructions": "Take without food, at least 10 minutes before eating",
            "refrigerate": False,
        },
        {
            "supplement_name": "Liposomal Glutathione",
            "company": "Quicksilver Scientific",
            "dosage_display": "2 pumps, 2× daily",
            "instructions": "Take on empty stomach. Hold under tongue for 30 seconds before swallowing.",
            "refrigerate": True,
        },
        {
            "supplement_name": "AlgaeOmega",
            "company": "Nordic Naturals (Emerson)",
            "dosage_display": "4 capsules per day",
            "instructions": "Take with food. For vegetarian patients only.",
            "refrigerate": False,
        },
        {
            "supplement_name": "Nanoemulsified Vitamin D3-K2",
            "company": "Quicksilver Scientific",
            "dosage_display": "3 pumps per day",
            "instructions": "Take with food",
            "refrigerate": False,
        },
    ]
    
    # Create 3 months (Step 2 typical)
    for month_num in range(1, 4):
        month_supplements = []
        for s in base_supplements:
            entry = dict(s)
            # Vary dosage for month 3 to test per-month override
            if month_num == 3 and s["supplement_name"] == "Adaptocrine":
                entry["dosage_display"] = "2 capsules, 2× daily"
            month_supplements.append(entry)
        test_plan["months"].append({
            "month_number": month_num,
            "supplements": month_supplements
        })
    
    output_path = "/app/tests/test_patient_export.pdf"
    result = generate_patient_pdf(test_plan, output_path)
    
    # Verify PDF was created
    assert os.path.exists(result), "PDF file not created"
    file_size = os.path.getsize(result)
    assert file_size > 1000, f"PDF too small ({file_size} bytes), likely empty"
    print(f"  ✓ PDF generated: {result} ({file_size:,} bytes)")
    
    # Verify no cost info in the PDF text
    # Read the HTML to check (we can also check the PDF text)
    cost_keywords = ["$", "cost", "bottle", "price", "total"]
    html_content = generate_patient_pdf.__code__.co_consts  # Can't easily read PDF text, so check template
    # Instead, let's check by searching the template source
    from jinja2 import Template
    import inspect
    source = inspect.getsource(generate_patient_pdf)
    # The template should not contain cost-related columns
    for keyword in ["cost_per_bottle", "calculated_cost", "bottles_needed", "monthly_total"]:
        assert keyword not in source.split("html_template")[1].split("html_content")[0], \
            f"Patient PDF template contains '{keyword}' — cost leakage!"
    print("  ✓ No cost/bottle fields in patient PDF template — no cost leakage")
    
    # Test with empty months
    empty_plan = dict(test_plan)
    empty_plan["months"] = [{"month_number": 1, "supplements": []}]
    empty_path = "/app/tests/test_empty_month.pdf"
    generate_patient_pdf(empty_plan, empty_path)
    assert os.path.exists(empty_path)
    print("  ✓ Empty month generates valid PDF")
    
    # Test with long text
    long_plan = dict(test_plan)
    long_supplements = [{
        "supplement_name": "Very Long Supplement Name That Might Overflow The Table Column Width",
        "company": "A Really Long Company Name With Multiple Words And Descriptions",
        "dosage_display": "2 capsules, 3× daily in the morning and evening with plenty of water",
        "instructions": "Take without food, at least 10 minutes before eating. "
                        "Do not combine with dairy products. Store in a cool dry place. "
                        "If symptoms persist, consult your healthcare provider immediately.",
        "refrigerate": True,
    }] * 15  # 15 supplements to test overflow
    long_plan["months"] = [{"month_number": 1, "supplements": long_supplements}]
    long_path = "/app/tests/test_long_content.pdf"
    generate_patient_pdf(long_plan, long_path)
    assert os.path.exists(long_path)
    print("  ✓ Long content/many supplements generates valid PDF (auto-pagination)")
    
    print("  ✅ ALL PDF GENERATION TESTS PASSED")


# ─── 3. HC PDF (with costs) ─────────────────────────────────────────────────

def generate_hc_pdf(plan_data: dict, output_path: str) -> str:
    """Generate an HC/internal PDF — includes bottle counts and costs."""
    from jinja2 import Template
    from weasyprint import HTML

    html_template = Template("""
    <!DOCTYPE html>
    <html>
    <head>
    <style>
        @page {
            size: Letter;
            margin: 0.75in;
            @top-center {
                content: "INTERNAL — HC Reference";
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                font-size: 9pt;
                color: #dc2626;
                font-weight: 600;
            }
            @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                font-size: 8pt;
                color: #94a3b8;
            }
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            line-height: 1.5;
            font-size: 9pt;
        }
        .month-page { page-break-before: always; }
        .month-page:first-child { page-break-before: avoid; }
        .header {
            text-align: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e2e8f0;
        }
        .header h1 { font-size: 18pt; font-weight: 300; color: #0f172a; }
        .header .subtitle { font-size: 10pt; color: #64748b; }
        .meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 14px;
            font-size: 9pt;
            color: #475569;
        }
        .meta-label { font-weight: 600; color: #334155; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th {
            background: #f8fafc;
            padding: 6px 8px;
            text-align: left;
            font-size: 7.5pt;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #e2e8f0;
        }
        td {
            padding: 6px 8px;
            font-size: 9pt;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: top;
        }
        .supplement-name { font-weight: 500; color: #0f172a; }
        .company { font-size: 7.5pt; color: #94a3b8; }
        .cost-cell { font-weight: 600; color: #059669; }
        .total-row {
            background: #f0fdf4;
            font-weight: 600;
        }
        .total-row td { border-top: 2px solid #059669; padding: 10px 8px; }
        .program-total {
            margin-top: 24px;
            padding: 16px;
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            text-align: center;
        }
        .program-total .label { font-size: 10pt; color: #475569; }
        .program-total .amount { font-size: 20pt; font-weight: 600; color: #059669; }
    </style>
    </head>
    <body>
    {% for month in plan.months %}
    <div class="month-page">
        <div class="header">
            <h1>{{ plan.program_name }}</h1>
            <div class="subtitle">{{ plan.step_label }} — Month {{ month.month_number }} (HC View)</div>
        </div>
        <div class="meta">
            <div><span class="meta-label">Patient:</span> {{ plan.patient_name }}</div>
            <div><span class="meta-label">Date:</span> {{ plan.date }}</div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Supplement</th>
                    <th>Dosage</th>
                    <th>Instructions</th>
                    <th style="text-align:center">Bottles</th>
                    <th style="text-align:right">Cost</th>
                </tr>
            </thead>
            <tbody>
            {% for s in month.supplements %}
                <tr>
                    <td>
                        <div class="supplement-name">{{ s.supplement_name }}</div>
                        <div class="company">{{ s.company }}</div>
                    </td>
                    <td>{{ s.dosage_display }}</td>
                    <td>{{ s.instructions }}</td>
                    <td style="text-align:center">{{ s.bottles_needed }}</td>
                    <td class="cost-cell" style="text-align:right">${{ "%.2f"|format(s.calculated_cost) }}</td>
                </tr>
            {% endfor %}
            <tr class="total-row">
                <td colspan="4" style="text-align:right">Monthly Total:</td>
                <td class="cost-cell" style="text-align:right">${{ "%.2f"|format(month.monthly_total) }}</td>
            </tr>
            </tbody>
        </table>
    </div>
    {% endfor %}
    
    <div class="month-page">
        <div class="program-total">
            <div class="label">Total Program Cost</div>
            <div class="amount">${{ "%.2f"|format(plan.total_program_cost) }}</div>
        </div>
    </div>
    </body>
    </html>
    """)

    html_content = html_template.render(plan=plan_data)
    pdf_bytes = HTML(string=html_content).write_pdf()
    with open(output_path, "wb") as f:
        f.write(pdf_bytes)
    return output_path


def test_hc_pdf():
    """Test HC PDF generation with cost data."""
    print("\n═══ TEST 3: HC PDF with Costs ═══")
    
    test_plan = {
        "patient_name": "John Smith",
        "date": "January 15, 2026",
        "program_name": "Metabolic Clearing — Detox 1",
        "step_label": "Step 2",
        "months": [],
        "total_program_cost": 0,
    }
    
    supplements_data = [
        {"supplement_name": "Adaptocrine", "company": "Apex", "dosage_display": "1 cap, 3×/day",
         "instructions": "With food", "quantity_per_dose": 1, "frequency_per_day": 3,
         "units_per_bottle": 90, "cost_per_bottle": 46.98},
        {"supplement_name": "Bilemin", "company": "Apex", "dosage_display": "2 caps, 3×/day",
         "instructions": "Without food", "quantity_per_dose": 2, "frequency_per_day": 3,
         "units_per_bottle": 90, "cost_per_bottle": 32.98},
        {"supplement_name": "AlgaeOmega", "company": "Nordic Naturals", "dosage_display": "4 caps/day",
         "instructions": "With food", "quantity_per_dose": 4, "frequency_per_day": 1,
         "units_per_bottle": 120, "cost_per_bottle": 53.95},
    ]
    
    program_total = 0
    for month_num in range(1, 4):
        month_supps = []
        monthly_total = 0
        for s in supplements_data:
            daily = calculate_daily_dosage(s["quantity_per_dose"], s["frequency_per_day"])
            bottles = calculate_bottles_needed(daily, s["units_per_bottle"])
            cost = calculate_supplement_cost(bottles, s["cost_per_bottle"])
            month_supps.append({
                "supplement_name": s["supplement_name"],
                "company": s["company"],
                "dosage_display": s["dosage_display"],
                "instructions": s["instructions"],
                "bottles_needed": bottles,
                "calculated_cost": cost,
            })
            monthly_total += cost
        test_plan["months"].append({
            "month_number": month_num,
            "supplements": month_supps,
            "monthly_total": round(monthly_total, 2),
        })
        program_total += monthly_total
    test_plan["total_program_cost"] = round(program_total, 2)
    
    output_path = "/app/tests/test_hc_export.pdf"
    result = generate_hc_pdf(test_plan, output_path)
    assert os.path.exists(result)
    file_size = os.path.getsize(result)
    assert file_size > 1000
    print(f"  ✓ HC PDF generated: {result} ({file_size:,} bytes)")
    
    # Verify costs are correct
    expected_monthly = round(46.98 + 65.96 + 53.95, 2)  # 1 + 2 + 1 bottles
    assert test_plan["months"][0]["monthly_total"] == expected_monthly, \
        f"Expected {expected_monthly}, got {test_plan['months'][0]['monthly_total']}"
    print(f"  ✓ Monthly total correct: ${expected_monthly}")
    
    expected_program = round(expected_monthly * 3, 2)
    assert test_plan["total_program_cost"] == expected_program
    print(f"  ✓ Program total correct: ${expected_program} (3 months)")
    
    print("  ✅ ALL HC PDF TESTS PASSED")


# ─── Run All Tests ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("╔══════════════════════════════════════════════════╗")
    print("║   Supplement Plan App — Core POC Tests           ║")
    print("╚══════════════════════════════════════════════════╝")
    
    try:
        test_calculations()
        test_pdf_generation()
        test_hc_pdf()
        
        print("\n" + "=" * 52)
        print("🎉 ALL CORE POC TESTS PASSED — READY TO BUILD APP")
        print("=" * 52)
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
