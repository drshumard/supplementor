"""
PDF generation for patient and HC exports using fpdf2.
Layout matches clinic protocol style: Time groupings, With Food, Notes, Month Order.
"""
import os
import math
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

TIME_ORDER = ["AM", "Afternoon", "PM", "Bedtime"]


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
    """Group supplements by time_of_day."""
    groups = {}
    for s in supplements:
        t = s.get("time_of_day", "AM") or "AM"
        if t not in groups:
            groups[t] = []
        groups[t].append(s)
    # Return in order
    result = []
    for t in TIME_ORDER:
        if t in groups:
            result.append((t, groups[t]))
    # Any remaining
    for t, supps in groups.items():
        if t not in TIME_ORDER:
            result.append((t, supps))
    return result


def _draw_header(pdf, plan):
    """Draw logo + program title."""
    y_start = pdf.get_y()
    if os.path.exists(LOGO_PATH):
        pdf.image(LOGO_PATH, x=pdf.l_margin, y=y_start, w=40)

    pdf.set_xy(pdf.l_margin + 45, y_start + 2)
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(*DARK)
    program = _safe(plan.get("program_name", ""))
    step = _safe(plan.get("step_label", ""))
    pdf.cell(0, 10, f"{program} - {step}", new_x="LMARGIN", new_y="NEXT")

    pdf.set_xy(pdf.l_margin + 45, y_start + 14)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(*GRAY)
    pdf.cell(0, 8, f"Patient: {_safe(plan.get('patient_name', ''))}    Date: {_safe(plan.get('date', ''))}", new_x="LMARGIN", new_y="NEXT")

    pdf.set_y(y_start + 30)
    pdf.set_draw_color(*LIGHT_GRAY)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
    pdf.ln(6)


def _draw_time_table(pdf, time_label, supps, show_costs=False):
    """Draw a time-grouped table (AM/Afternoon/PM)."""
    page_w = pdf.w - pdf.l_margin - pdf.r_margin

    if show_costs:
        cols = [25, 45, 28, 22, 22, page_w - 142]  # Time, Supplement, Dose, With Food, Btls, Notes
        headers = ["Time", "Supplement", "Dose", "Food", "Btls", "Notes"]
    else:
        cols = [25, 50, 30, 25, page_w - 130]  # Time, Supplement, Dose, With Food, Notes
        headers = ["Time", "Supplement", "Dose", "Food", "Notes"]

    # Check if we need a page break (header + at least 2 rows)
    needed = 10 + len(supps) * 8
    if pdf.get_y() + needed > pdf.h - 25:
        pdf.add_page()

    # Table header row
    pdf.set_fill_color(*TEAL_LIGHT)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(*TEAL)
    x = pdf.l_margin
    for i, h in enumerate(headers):
        pdf.set_xy(x, pdf.get_y())
        pdf.cell(cols[i], 8, h, border=1, fill=True, new_x="RIGHT")
        x += cols[i]
    pdf.ln()

    # Data rows
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*DARK)

    for idx, s in enumerate(supps):
        row_y = pdf.get_y()

        # Page break check
        if row_y > pdf.h - 25:
            pdf.add_page()
            row_y = pdf.get_y()

        x = pdf.l_margin

        # Time (only on first row)
        pdf.set_xy(x, row_y)
        if idx == 0:
            pdf.set_font("Helvetica", "B", 9)
            pdf.cell(cols[0], 8, time_label, border="LBR")
            pdf.set_font("Helvetica", "", 9)
        else:
            pdf.cell(cols[0], 8, "", border="LBR")
        x += cols[0]

        # Supplement name
        pdf.set_xy(x, row_y)
        name = _safe(s.get("supplement_name", ""))
        pdf.cell(cols[1], 8, name[:28], border="LBR")
        x += cols[1]

        # Dose
        pdf.set_xy(x, row_y)
        dose = _safe(s.get("dosage_display", ""))
        pdf.cell(cols[2], 8, dose[:18], border="LBR")
        x += cols[2]

        # With Food
        pdf.set_xy(x, row_y)
        food = "Yes" if s.get("with_food", True) else "No"
        pdf.cell(cols[3], 8, food, border="LBR")
        x += cols[3]

        if show_costs:
            # Bottles
            pdf.set_xy(x, row_y)
            btls = _safe(s.get("bottles_needed", "-"))
            pdf.cell(cols[4], 8, str(btls), border="LBR")
            x += cols[4]

        # Notes/Instructions - use multi_cell for wrapping
        pdf.set_xy(x, row_y)
        notes = _safe(s.get("instructions", ""))
        if s.get("refrigerate"):
            if notes:
                notes += ". "
            notes += "Refrigerate"
            pdf.set_text_color(*RED)
        
        last_col = cols[-1]
        # Calculate height needed
        note_lines = max(1, math.ceil(pdf.get_string_width(notes) / (last_col - 2)))
        cell_h = max(8, note_lines * 5)
        
        if cell_h > 8:
            pdf.multi_cell(last_col, 5, notes, border="LBR", max_line_height=5)
            # Reset y to match row height
            end_y = pdf.get_y()
            if end_y - row_y < 8:
                pdf.set_y(row_y + 8)
        else:
            pdf.cell(last_col, 8, notes[:50], border="LBR")
            pdf.ln()

        pdf.set_text_color(*DARK)

    pdf.ln(4)


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
