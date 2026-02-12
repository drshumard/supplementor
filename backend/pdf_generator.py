"""
PDF generation for patient and HC exports using WeasyPrint.
"""
import io
from jinja2 import Template
from weasyprint import HTML


PATIENT_PDF_TEMPLATE = """
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
    .month-page { page-break-before: always; }
    .month-page:first-child { page-break-before: avoid; }
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
    .supplement-name { font-weight: 500; color: #0f172a; }
    .company { font-size: 8pt; color: #94a3b8; margin-top: 1px; }
    .instructions { font-size: 9pt; color: #64748b; font-style: italic; }
    .fridge-badge {
        display: inline-block;
        background: #dbeafe;
        color: #1d4ed8;
        font-size: 7pt;
        padding: 1px 5px;
        border-radius: 3px;
        font-weight: 600;
    }
</style>
</head>
<body>
{% for month in plan.months %}
<div class="month-page">
    <div class="header">
        <h1>{{ plan.program_name }}</h1>
        <div class="subtitle">{{ plan.step_label }} &mdash; Month {{ month.month_number }}</div>
    </div>
    <div class="meta">
        <div><span class="meta-label">Patient:</span> {{ plan.patient_name }}</div>
        <div><span class="meta-label">Date:</span> {{ plan.date }}</div>
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
                <td class="instructions">{{ s.instructions }}{% if s.hc_notes and false %} — {{ s.hc_notes }}{% endif %}</td>
            </tr>
        {% endfor %}
        </tbody>
    </table>
</div>
{% endfor %}
</body>
</html>
"""


HC_PDF_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
<style>
    @page {
        size: Letter;
        margin: 0.75in;
        @top-center {
            content: "INTERNAL \2014  HC Reference";
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
    .total-row { background: #f0fdf4; font-weight: 600; }
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
        <div class="subtitle">{{ plan.step_label }} &mdash; Month {{ month.month_number }} (HC View)</div>
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
                <td style="text-align:center">{{ s.bottles_needed or '-' }}</td>
                <td class="cost-cell" style="text-align:right">${{ "%.2f"|format(s.calculated_cost or 0) }}</td>
            </tr>
        {% endfor %}
        <tr class="total-row">
            <td colspan="4" style="text-align:right">Monthly Total:</td>
            <td class="cost-cell" style="text-align:right">${{ "%.2f"|format(month.monthly_total_cost or 0) }}</td>
        </tr>
        </tbody>
    </table>
</div>
{% endfor %}

<div class="month-page">
    <div class="program-total">
        <div class="label">Total Program Cost</div>
        <div class="amount">${{ "%.2f"|format(plan.total_program_cost or 0) }}</div>
    </div>
</div>
</body>
</html>
"""


def generate_patient_pdf(plan_data: dict) -> bytes:
    """Generate patient-facing PDF bytes (no cost info)."""
    template = Template(PATIENT_PDF_TEMPLATE)
    html_content = template.render(plan=plan_data)
    return HTML(string=html_content).write_pdf()


def generate_hc_pdf(plan_data: dict) -> bytes:
    """Generate HC/internal PDF bytes (with costs)."""
    template = Template(HC_PDF_TEMPLATE)
    html_content = template.render(plan=plan_data)
    return HTML(string=html_content).write_pdf()
