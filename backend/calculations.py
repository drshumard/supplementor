"""
Calculation engine for supplement bottles and costs.
"""
import math


def calculate_daily_dosage(quantity_per_dose: int, frequency_per_day: int) -> int:
    """Calculate total daily dosage from quantity and frequency."""
    return (quantity_per_dose or 0) * (frequency_per_day or 0)


def calculate_bottles_needed(daily_dosage: int, units_per_bottle: int, bottles_per_month_override: float = None) -> float:
    """Calculate bottles needed for a 30-day month.
    If bottles_per_month_override is set, use that instead."""
    if bottles_per_month_override is not None and bottles_per_month_override > 0:
        return bottles_per_month_override
    if not units_per_bottle or units_per_bottle <= 0:
        return 0
    if daily_dosage <= 0:
        return 0
    return math.ceil((daily_dosage * 30) / units_per_bottle)


def calculate_supplement_cost(bottles_needed: float, cost_per_bottle: float) -> float:
    """Calculate cost for a supplement for one month."""
    return round(bottles_needed * cost_per_bottle, 2)


def calculate_monthly_total(supplements: list) -> float:
    """Sum all supplement costs for a month."""
    return round(sum(s.get("calculated_cost", 0) or 0 for s in supplements), 2)


def recalculate_plan_costs(plan_data: dict, supplier_freight: dict = None) -> dict:
    """Recalculate all bottle counts and costs for a plan.
    supplier_freight: {supplier_name: freight_charge} — adds one freight per unique supplier per month.
    """
    supplier_freight = supplier_freight or {}
    total_program_cost = 0.0
    for month in plan_data.get("months", []):
        monthly_total = 0.0
        month_suppliers = set()
        for supp in month.get("supplements", []):
            daily = calculate_daily_dosage(
                supp.get("quantity_per_dose") or 0,
                supp.get("frequency_per_day") or 0
            )
            bottles = calculate_bottles_needed(
                daily,
                supp.get("units_per_bottle") or 0,
                supp.get("bottles_per_month_override")
            )
            cost = calculate_supplement_cost(bottles, supp.get("cost_per_bottle", 0))
            supp["bottles_needed"] = bottles
            supp["calculated_cost"] = cost
            monthly_total += cost
            # Track unique suppliers for freight
            supplier = (supp.get("supplier") or "").strip()
            if supplier:
                month_suppliers.add(supplier)
        # Add freight per unique supplier (deduplicated)
        freight_total = 0.0
        for supplier in month_suppliers:
            freight = supplier_freight.get(supplier, 0)
            if freight > 0:
                freight_total += freight
        month["freight_total"] = round(freight_total, 2)
        month["monthly_total_cost"] = round(monthly_total + freight_total, 2)
        month["supplement_cost"] = round(monthly_total, 2)
        total_program_cost += monthly_total + freight_total
    plan_data["total_program_cost"] = round(total_program_cost, 2)
    return plan_data
