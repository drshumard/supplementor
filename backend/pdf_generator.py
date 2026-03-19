"""
PDF generation for patient and HC exports using fpdf2.
Layout matches clinic protocol style: Time groupings, With Food, Notes, Month Order.
"""
import os
import math
import re
from fpdf import FPDF

LOGO_PATH = os.path.join(os.path.dirname(__file__), "logo.png")

# Teal palette
TEAL = (13, 95, 104)
TEAL_LIGHT = (214, 236, 232)
TEAL_BG = (234, 244, 243)
DARK = (15, 23, 42)
GRAY = (100, 116, 139)
LIGHT_GRAY = (226, 232, 240)
WHITE = (255, 255, 255)
RED = (197, 59, 59)
GREEN = (20, 125, 90)

TIME_ORDER = ["AM", "Afternoon", "PM"]


class ProtocolPDF(FPDF):
    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=20)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "", 7)
        self.set_text_color(*GRAY)
        self.cell(0, 8, f"Page {self.page_no()}/{{nb}}", align="C")


def _safe(val):
    if val is None:
        return ""
    return str(val)


def _group_by_time(supplements):
    """Group supplements by time slots. A supplement with times: ["AM", "PM"] appears in both.
    Backfills times from frequency_per_day if times is missing."""
    groups = {t: [] for t in TIME_ORDER}
    for s in supplements:
        times = s.get("times")
        if not times or len(times) == 0:
            # Backfill from frequency
            freq = s.get("frequency_per_day") or 1
            if freq >= 3:
                times = ["AM", "Afternoon", "PM"]
            elif freq == 2:
                times = ["AM", "PM"]
            else:
                times = ["AM"]
            s["times"] = times
        for t in times:
            if t in groups:
                groups[t].append(s)
    return [(t, supps) for t in TIME_ORDER if (supps := groups.get(t, [])) and len(supps) > 0]


def _draw_header(pdf, plan):
    """Draw centered logo, program title, patient name, and date."""
    # Logo centered
    if os.path.exists(LOGO_PATH):
        logo_w = 35
        x = (pdf.w - logo_w) / 2
        pdf.image(LOGO_PATH, x=x, y=pdf.get_y(), w=logo_w)
        pdf.ln(22)

    # Program + Step — centered, slightly smaller
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(*DARK)
    program = _safe(plan.get("program_name", ""))
    step = _safe(plan.get("step_label", ""))
    pdf.cell(0, 8, f"{program} - {step}", align="C", new_x="LMARGIN", new_y="NEXT")

    # Patient name — centered, no label
    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(*DARK)
    pdf.cell(0, 7, _safe(plan.get("patient_name", "")), align="C", new_x="LMARGIN", new_y="NEXT")

    # Date — centered, lighter
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*GRAY)
    pdf.cell(0, 6, _safe(plan.get("date", "")), align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(3)
    pdf.set_draw_color(*LIGHT_GRAY)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
    pdf.ln(5)


def _draw_time_table(pdf, time_label, supps, show_costs=False):
    """Draw a time-grouped table with a section header."""
    page_w = pdf.w - pdf.l_margin - pdf.r_margin

    # Check page break
    needed = 20 + len(supps) * 8
    if pdf.get_y() + needed > pdf.h - 25:
        pdf.add_page()

    # Section header — time label
    pdf.set_fill_color(*TEAL)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(page_w, 8, f"  {time_label}", fill=True, new_x="LMARGIN", new_y="NEXT")

    # Column headers
    if show_costs:
        cols = [55, 30, 22, 22, page_w - 129]
        headers = ["Supplement", "Dose", "Food", "Btls", "Notes"]
    else:
        cols = [60, 35, 25, page_w - 120]
        headers = ["Supplement", "Dose", "Food", "Notes"]

    pdf.set_fill_color(*TEAL_LIGHT)
    pdf.set_font("Helvetica", "B", 7.5)
    pdf.set_text_color(*TEAL)
    x = pdf.l_margin
    for i, h in enumerate(headers):
        pdf.set_xy(x, pdf.get_y())
        pdf.cell(cols[i], 7, h.upper(), border=0, fill=True, new_x="RIGHT")
        x += cols[i]
    pdf.ln()

    # Data rows
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*DARK)

    for s in supps:
        if pdf.get_y() > pdf.h - 20:
            pdf.add_page()

        row_y = pdf.get_y()
        x = pdf.l_margin

        # Supplement name
        pdf.set_xy(x, row_y)
        pdf.set_font("Helvetica", "B", 8.5)
        name = _safe(s.get("supplement_name", ""))
        pdf.cell(cols[0], 7, name[:32], border="B", new_x="RIGHT")
        x += cols[0]

        # Dose — show per-time quantity only, not the full "2 caps 2x/day"
        pdf.set_xy(x, row_y)
        pdf.set_font("Helvetica", "", 8.5)
        qty = s.get("quantity_per_dose") or 0
        unit_type = s.get("unit_type") or "caps"
        if not unit_type:
            # Try to extract unit from dosage_display
            dd = _safe(s.get("dosage_display", ""))
            for u in ["caps", "cap", "pumps", "pump", "scoop", "scoops", "ml", "tablet", "packet", "drop", "lozenge"]:
                if u in dd.lower():
                    unit_type = u
                    break
            else:
                unit_type = "caps"
        if qty > 0:
            unit_label = unit_type
            if qty == 1:
                unit_label = unit_type.rstrip("s")  # caps -> cap
            elif not unit_type.endswith("s") and unit_type not in ("ml", "g"):
                unit_label = unit_type + "s"  # pump -> pumps
            dose_text = f"{qty} {unit_label}"
        else:
            # Fallback: try to extract just the quantity part from dosage_display
            dose_text = _safe(s.get("dosage_display", ""))
            # Strip frequency part like "2x/day", "3x/day", "per day"
            dose_text = re.sub(r'\s*\d*x\s*/?\s*day.*', '', dose_text, flags=re.IGNORECASE)
            dose_text = re.sub(r'\s*per\s*day.*', '', dose_text, flags=re.IGNORECASE)
        pdf.cell(cols[1], 7, dose_text[:20], border="B", new_x="RIGHT")
        x += cols[1]

        # With Food
        pdf.set_xy(x, row_y)
        food = "Yes" if s.get("with_food", True) else "No"
        pdf.cell(cols[2], 7, food, border="B", new_x="RIGHT")
        x += cols[2]

        if show_costs:
            # Bottles
            pdf.set_xy(x, row_y)
            btls = s.get("bottles_needed") or "-"
            pdf.cell(cols[3], 7, str(btls), border="B", new_x="RIGHT")
            x += cols[3]

        # Notes — wrapping
        pdf.set_xy(x, row_y)
        notes = _safe(s.get("instructions", ""))
        if s.get("refrigerate"):
            notes = ("Refrigerate. " + notes).strip()
            pdf.set_text_color(*RED)

        last_w = cols[-1]
        note_lines = max(1, len(notes) // 40 + 1) if notes else 1
        if note_lines > 1:
            pdf.multi_cell(last_w, 4, notes, border="B", max_line_height=4)
        else:
            pdf.cell(last_w, 7, notes[:55], border="B", new_x="LMARGIN", new_y="NEXT")

        pdf.set_text_color(*DARK)

    pdf.ln(6)


def _draw_month_order(pdf, month, plan):
    """Draw the Month Order summary (bottles + duration)."""
    supps = month.get("supplements", [])
    if not supps:
        return

    num_months = len(plan.get("months", []))

    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*DARK)
    pdf.cell(0, 8, f"Month {month.get('month_number', 1)} Order", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    page_w = pdf.w - pdf.l_margin - pdf.r_margin
    col_w = page_w / 2 - 2
    cols_each = [col_w * 0.4, col_w * 0.15, col_w * 0.2, col_w * 0.25]

    # Header
    pdf.set_fill_color(*TEAL_LIGHT)
    pdf.set_font("Helvetica", "B", 7.5)
    pdf.set_text_color(*TEAL)

    # Left table header
    x = pdf.l_margin
    for h, w in zip(["Supplement", "Bottles", "Duration", "Notes"], cols_each):
        pdf.set_xy(x, pdf.get_y())
        pdf.cell(w, 7, h, border=1, fill=True, new_x="RIGHT")
        x += w
    
    x += 4  # gap
    for h, w in zip(["Supplement", "Bottles", "Duration", "Notes"], cols_each):
        pdf.set_xy(x, pdf.get_y())
        pdf.cell(w, 7, h, border=1, fill=True, new_x="RIGHT")
        x += w
    pdf.ln()

    # Data - split into two columns
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*DARK)

    # Deduplicate supplements
    seen = {}
    for s in supps:
        name = s.get("supplement_name", "")
        if name not in seen:
            seen[name] = s

    unique = list(seen.values())
    mid = math.ceil(len(unique) / 2)
    left = unique[:mid]
    right = unique[mid:]

    max_rows = max(len(left), len(right))
    for i in range(max_rows):
        row_y = pdf.get_y()
        if row_y > pdf.h - 20:
            pdf.add_page()
            row_y = pdf.get_y()

        x = pdf.l_margin
        # Left side
        if i < len(left):
            s = left[i]
            pdf.set_xy(x, row_y)
            pdf.cell(cols_each[0], 7, _safe(s.get("supplement_name", ""))[:22], border="LBR")
            pdf.cell(cols_each[1], 7, str(s.get("bottles_needed", 1) or 1), border="LBR")
            pdf.cell(cols_each[2], 7, f"{num_months} months", border="LBR")
            note = "refrigerate" if s.get("refrigerate") else ""
            if note:
                pdf.set_text_color(*RED)
            pdf.cell(cols_each[3], 7, note, border="LBR")
            pdf.set_text_color(*DARK)
        else:
            pdf.set_xy(x, row_y)
            for w in cols_each:
                pdf.cell(w, 7, "", border="LBR")

        x = pdf.l_margin + col_w + 4
        # Right side
        if i < len(right):
            s = right[i]
            pdf.set_xy(x, row_y)
            pdf.cell(cols_each[0], 7, _safe(s.get("supplement_name", ""))[:22], border="LBR")
            pdf.cell(cols_each[1], 7, str(s.get("bottles_needed", 1) or 1), border="LBR")
            pdf.cell(cols_each[2], 7, f"{num_months} months", border="LBR")
            note = "refrigerate" if s.get("refrigerate") else ""
            if note:
                pdf.set_text_color(*RED)
            pdf.cell(cols_each[3], 7, note, border="LBR")
            pdf.set_text_color(*DARK)
        else:
            pdf.set_xy(x, row_y)
            for w in cols_each:
                pdf.cell(w, 7, "", border="LBR")

        pdf.ln()


def generate_patient_pdf(plan_data: dict) -> bytes:
    """Generate patient-facing PDF (no cost info)."""
    pdf = ProtocolPDF()
    pdf.alias_nb_pages()

    months = plan_data.get("months") or []
    for month in months:
        pdf.add_page()
        _draw_header(pdf, plan_data)

        # Month label
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(*DARK)
        pdf.cell(40, 8, f"Month {month.get('month_number', 1)}")
        pdf.set_font("Helvetica", "I", 9)
        pdf.set_text_color(*RED)
        pdf.cell(0, 8, "*Keep 2 hours from all medications", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(4)

        # Group by time
        groups = _group_by_time(month.get("supplements", []))
        for time_label, supps in groups:
            _draw_time_table(pdf, time_label, supps, show_costs=False)

        # Month order
        _draw_month_order(pdf, month, plan_data)

    return pdf.output()


def generate_hc_pdf(plan_data: dict) -> bytes:
    """Generate HC/internal PDF (with costs)."""
    pdf = ProtocolPDF()
    pdf.alias_nb_pages()

    months = plan_data.get("months") or []
    for month in months:
        pdf.add_page()
        _draw_header(pdf, plan_data)

        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(*DARK)
        pdf.cell(40, 8, f"Month {month.get('month_number', 1)}")
        pdf.set_font("Helvetica", "I", 9)
        pdf.set_text_color(*RED)
        pdf.cell(0, 8, "HC INTERNAL VIEW", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(4)

        groups = _group_by_time(month.get("supplements", []))
        for time_label, supps in groups:
            _draw_time_table(pdf, time_label, supps, show_costs=True)

        # Cost summary
        pdf.ln(4)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*GREEN)
        monthly_total = month.get("monthly_total_cost", 0) or 0
        pdf.cell(0, 8, f"Monthly Total: ${monthly_total:.2f}", new_x="LMARGIN", new_y="NEXT")

        _draw_month_order(pdf, month, plan_data)

    # Program total page
    if len(months) > 1:
        pdf.add_page()
        _draw_header(pdf, plan_data)
        pdf.ln(20)
        pdf.set_font("Helvetica", "", 11)
        pdf.set_text_color(*GRAY)
        pdf.cell(0, 10, "Total Program Cost", align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "B", 28)
        pdf.set_text_color(*GREEN)
        total = plan_data.get("total_program_cost", 0) or 0
        pdf.cell(0, 15, f"${total:.2f}", align="C", new_x="LMARGIN", new_y="NEXT")

    return pdf.output()
