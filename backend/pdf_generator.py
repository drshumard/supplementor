"""
PDF generation for patient and HC exports using fpdf2 (pure Python, no system deps).
"""
from fpdf import FPDF


class BasePDF(FPDF):
    """Base PDF with common styling."""
    
    def __init__(self, header_text="Clarity Wellness Center"):
        super().__init__()
        self._header_text = header_text
        self.set_auto_page_break(auto=True, margin=25)
    
    def header(self):
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(148, 163, 184)
        self.cell(0, 8, self._header_text, align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(2)
    
    def footer(self):
        self.set_y(-20)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(148, 163, 184)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")
    
    def _draw_line(self, y=None):
        if y is None:
            y = self.get_y()
        self.set_draw_color(226, 232, 240)
        self.line(self.l_margin, y, self.w - self.r_margin, y)


def _safe(val):
    """Safely convert value to string."""
    if val is None:
        return ""
    return str(val)


def generate_patient_pdf(plan_data: dict) -> bytes:
    """Generate patient-facing PDF bytes (no cost info)."""
    pdf = BasePDF("Clarity Wellness Center")
    pdf.alias_nb_pages()
    
    months = plan_data.get("months") or []
    
    for i, month in enumerate(months):
        pdf.add_page()
        
        # Title
        pdf.set_font("Helvetica", "B", 22)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(0, 12, _safe(plan_data.get("program_name", "")), align="C", new_x="LMARGIN", new_y="NEXT")
        
        pdf.set_font("Helvetica", "", 11)
        pdf.set_text_color(100, 116, 139)
        step = plan_data.get("step_label") or f"Step {plan_data.get('step_number', '')}"
        pdf.cell(0, 8, f"{step} - Month {month.get('month_number', i+1)}", align="C", new_x="LMARGIN", new_y="NEXT")
        
        pdf.ln(4)
        pdf._draw_line()
        pdf.ln(6)
        
        # Meta
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(51, 65, 85)
        pdf.cell(40, 7, "Patient:", new_x="RIGHT")
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(71, 85, 105)
        pdf.cell(60, 7, _safe(plan_data.get("patient_name", "")), new_x="RIGHT")
        
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(51, 65, 85)
        pdf.cell(25, 7, "Date:", new_x="RIGHT")
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(71, 85, 105)
        pdf.cell(0, 7, _safe(plan_data.get("date", "")), new_x="LMARGIN", new_y="NEXT")
        
        pdf.ln(8)
        
        # Table header
        col_w = [65, 45, 80]
        headers = ["Supplement", "Dosage", "Instructions"]
        
        pdf.set_fill_color(248, 250, 252)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(100, 116, 139)
        for j, h in enumerate(headers):
            pdf.cell(col_w[j], 10, h.upper(), border=0, fill=True, new_x="RIGHT")
        pdf.ln()
        
        pdf.set_draw_color(226, 232, 240)
        pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
        pdf.ln(2)
        
        # Table rows
        supplements = month.get("supplements") or []
        for s in supplements:
            y_start = pdf.get_y()
            
            # Check page break
            if y_start > 250:
                pdf.add_page()
                y_start = pdf.get_y()
            
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(15, 23, 42)
            name = _safe(s.get("supplement_name", ""))
            pdf.cell(col_w[0], 6, name, new_x="RIGHT")
            
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(30, 41, 59)
            pdf.cell(col_w[1], 6, _safe(s.get("dosage_display", "")), new_x="RIGHT")
            
            pdf.set_font("Helvetica", "I", 9)
            pdf.set_text_color(100, 116, 139)
            instr = _safe(s.get("instructions", ""))
            pdf.cell(col_w[2], 6, instr, new_x="LMARGIN", new_y="NEXT")
            
            # Company line
            pdf.set_font("Helvetica", "", 7)
            pdf.set_text_color(148, 163, 184)
            company = _safe(s.get("company", ""))
            fridge = " [REFRIGERATE]" if s.get("refrigerate") else ""
            pdf.cell(col_w[0], 4, f"{company}{fridge}", new_x="LMARGIN", new_y="NEXT")
            
            pdf.ln(3)
            
            # Separator
            pdf.set_draw_color(241, 245, 249)
            pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
            pdf.ln(2)
    
    return pdf.output()


def generate_hc_pdf(plan_data: dict) -> bytes:
    """Generate HC/internal PDF bytes (with costs)."""
    pdf = BasePDF("INTERNAL - HC Reference")
    pdf._header_text = "INTERNAL - HC Reference"
    pdf.alias_nb_pages()
    
    months = plan_data.get("months") or []
    
    for i, month in enumerate(months):
        pdf.add_page()
        
        # Title
        pdf.set_font("Helvetica", "B", 18)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(0, 10, _safe(plan_data.get("program_name", "")), align="C", new_x="LMARGIN", new_y="NEXT")
        
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(100, 116, 139)
        step = plan_data.get("step_label") or f"Step {plan_data.get('step_number', '')}"
        pdf.cell(0, 7, f"{step} - Month {month.get('month_number', i+1)} (HC View)", align="C", new_x="LMARGIN", new_y="NEXT")
        
        pdf.ln(3)
        pdf._draw_line()
        pdf.ln(5)
        
        # Meta
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(51, 65, 85)
        pdf.cell(30, 6, "Patient:", new_x="RIGHT")
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(71, 85, 105)
        pdf.cell(50, 6, _safe(plan_data.get("patient_name", "")), new_x="RIGHT")
        
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(51, 65, 85)
        pdf.cell(20, 6, "Date:", new_x="RIGHT")
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(71, 85, 105)
        pdf.cell(0, 6, _safe(plan_data.get("date", "")), new_x="LMARGIN", new_y="NEXT")
        
        pdf.ln(6)
        
        # Table header
        col_w = [50, 35, 50, 18, 27]
        headers = ["Supplement", "Dosage", "Instructions", "Bottles", "Cost"]
        
        pdf.set_fill_color(248, 250, 252)
        pdf.set_font("Helvetica", "B", 7.5)
        pdf.set_text_color(100, 116, 139)
        for j, h in enumerate(headers):
            align = "R" if j >= 3 else "L"
            pdf.cell(col_w[j], 9, h.upper(), border=0, fill=True, align=align, new_x="RIGHT")
        pdf.ln()
        
        pdf.set_draw_color(226, 232, 240)
        pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
        pdf.ln(2)
        
        # Rows
        supplements = month.get("supplements") or []
        for s in supplements:
            if pdf.get_y() > 250:
                pdf.add_page()
            
            pdf.set_font("Helvetica", "B", 9)
            pdf.set_text_color(15, 23, 42)
            pdf.cell(col_w[0], 6, _safe(s.get("supplement_name", "")), new_x="RIGHT")
            
            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(30, 41, 59)
            pdf.cell(col_w[1], 6, _safe(s.get("dosage_display", "")), new_x="RIGHT")
            
            pdf.set_font("Helvetica", "I", 8)
            pdf.set_text_color(100, 116, 139)
            pdf.cell(col_w[2], 6, _safe(s.get("instructions", "")), new_x="RIGHT")
            
            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(30, 41, 59)
            bottles = s.get("bottles_needed") or "-"
            pdf.cell(col_w[3], 6, str(bottles), align="R", new_x="RIGHT")
            
            pdf.set_font("Helvetica", "B", 9)
            pdf.set_text_color(5, 150, 105)
            cost = s.get("calculated_cost") or 0
            pdf.cell(col_w[4], 6, f"${cost:.2f}", align="R", new_x="LMARGIN", new_y="NEXT")
            
            # Company
            pdf.set_font("Helvetica", "", 7)
            pdf.set_text_color(148, 163, 184)
            pdf.cell(col_w[0], 4, _safe(s.get("company", "")), new_x="LMARGIN", new_y="NEXT")
            
            pdf.ln(2)
            pdf.set_draw_color(241, 245, 249)
            pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
            pdf.ln(2)
        
        # Monthly total
        pdf.ln(2)
        pdf.set_draw_color(5, 150, 105)
        pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
        pdf.ln(3)
        
        pdf.set_fill_color(240, 253, 244)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(5, 150, 105)
        total_w = sum(col_w)
        monthly_total = month.get("monthly_total_cost") or 0
        pdf.cell(total_w - col_w[-1], 10, "Monthly Total:", align="R", fill=True, new_x="RIGHT")
        pdf.cell(col_w[-1], 10, f"${monthly_total:.2f}", align="R", fill=True, new_x="LMARGIN", new_y="NEXT")
    
    # Program total page
    pdf.add_page()
    pdf.ln(40)
    
    pdf.set_fill_color(240, 253, 244)
    pdf.set_draw_color(187, 247, 208)
    x = (pdf.w - 120) / 2
    pdf.rect(x, pdf.get_y(), 120, 50, style="DF")
    
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(71, 85, 105)
    pdf.cell(0, 15, "Total Program Cost", align="C", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", "B", 24)
    pdf.set_text_color(5, 150, 105)
    program_total = plan_data.get("total_program_cost") or 0
    pdf.cell(0, 15, f"${program_total:.2f}", align="C", new_x="LMARGIN", new_y="NEXT")
    
    return pdf.output()
