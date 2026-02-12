import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '$0.00';
  return `$${Number(amount).toFixed(2)}`;
}

export function calculateDailyDosage(quantityPerDose, frequencyPerDay) {
  return (quantityPerDose || 0) * (frequencyPerDay || 0);
}

export function calculateBottlesNeeded(dailyDosage, unitsPerBottle, bottlesOverride) {
  if (bottlesOverride != null && bottlesOverride > 0) return bottlesOverride;
  if (!unitsPerBottle || unitsPerBottle <= 0) return 0;
  if (dailyDosage <= 0) return 0;
  return Math.ceil((dailyDosage * 30) / unitsPerBottle);
}

export function calculateSupplementCost(bottlesNeeded, costPerBottle) {
  return Math.round(bottlesNeeded * costPerBottle * 100) / 100;
}

export function recalculateMonthCosts(month) {
  let total = 0;
  for (const supp of month.supplements || []) {
    const daily = calculateDailyDosage(supp.quantity_per_dose, supp.frequency_per_day);
    const bottles = calculateBottlesNeeded(daily, supp.units_per_bottle, supp.bottles_per_month_override);
    const cost = calculateSupplementCost(bottles, supp.cost_per_bottle || 0);
    supp.bottles_needed = bottles;
    supp.calculated_cost = cost;
    total += cost;
  }
  month.monthly_total_cost = Math.round(total * 100) / 100;
  return month;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
