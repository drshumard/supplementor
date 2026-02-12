import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPlan, updatePlan, getSupplements, exportPatientPDF, exportHCPDF } from '../lib/api';
import { formatCurrency, recalculateMonthCosts, downloadBlob } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '../components/ui/command';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '../components/ui/popover';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  ArrowLeft, Plus, Trash2, Download, FileText, Eye, Save,
  Snowflake, ChevronsUpDown, Check,
} from 'lucide-react';
import { toast } from 'sonner';

export default function PlanEditorPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeMonth, setActiveMonth] = useState('1');
  const [showCosts, setShowCosts] = useState(true);
  const [supplements, setSupplements] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteRow, setDeleteRow] = useState(null);
  const [exporting, setExporting] = useState(false);
  const saveTimerRef = useRef(null);

  // Load plan
  useEffect(() => {
    const loadPlan = async () => {
      try {
        const p = await getPlan(planId);
        setPlan(p);
        if (p.months?.length > 0) setActiveMonth(String(p.months[0].month_number));
      } catch (err) {
        toast.error('Failed to load plan');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    loadPlan();
  }, [planId, navigate]);

  // Load supplements for search
  useEffect(() => {
    getSupplements('', true).then(r => setSupplements(r.supplements || [])).catch(() => {});
  }, []);

  // Auto-save with debounce
  const savePlan = useCallback(async (planData) => {
    if (!planData || !planId) return;
    setSaving(true);
    try {
      const result = await updatePlan(planId, {
        patient_name: planData.patient_name,
        date: planData.date,
        months: planData.months,
      });
      setPlan(prev => ({ ...prev, ...result }));
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }, [planId]);

  const debouncedSave = useCallback((planData) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => savePlan(planData), 800);
  }, [savePlan]);

  // Get current month data
  const currentMonth = plan?.months?.find(m => String(m.month_number) === activeMonth);

  // Recalculate all months
  const recalcAndUpdate = (newPlan) => {
    let totalProgram = 0;
    for (const month of newPlan.months || []) {
      recalculateMonthCosts(month);
      totalProgram += month.monthly_total_cost || 0;
    }
    newPlan.total_program_cost = Math.round(totalProgram * 100) / 100;
    setPlan({ ...newPlan });
    debouncedSave(newPlan);
  };

  // Add supplement to all months in the step
  const addSupplement = (supp) => {
    if (!plan) return;
    const newPlan = { ...plan };
    const entry = {
      supplement_id: supp._id,
      supplement_name: supp.supplement_name,
      company: supp.company || '',
      quantity_per_dose: supp.default_quantity_per_dose || null,
      frequency_per_day: supp.default_frequency_per_day || null,
      dosage_display: supp.default_dosage_display || '',
      instructions: supp.default_instructions || '',
      with_food: supp.default_instructions?.toLowerCase().includes('food') || false,
      hc_notes: '',
      units_per_bottle: supp.units_per_bottle || null,
      cost_per_bottle: supp.cost_per_bottle || 0,
      refrigerate: supp.refrigerate || false,
      bottles_needed: null,
      calculated_cost: null,
      bottles_per_month_override: supp.bottles_per_month || null,
    };
    // Add to all months
    for (const month of newPlan.months || []) {
      month.supplements = [...(month.supplements || []), { ...entry }];
    }
    recalcAndUpdate(newPlan);
    setSearchOpen(false);
    setSearchQuery('');
    toast.success(`Added ${supp.supplement_name}`);
  };

  // Remove supplement from all months
  const removeSupplement = (index) => {
    if (!plan) return;
    const newPlan = { ...plan };
    const suppName = currentMonth?.supplements?.[index]?.supplement_name;
    for (const month of newPlan.months || []) {
      month.supplements = (month.supplements || []).filter((_, i) => {
        if (month.month_number === Number(activeMonth)) return i !== index;
        return month.supplements[i]?.supplement_name !== suppName;
      });
    }
    recalcAndUpdate(newPlan);
    setDeleteRow(null);
    toast.success('Supplement removed');
  };

  // Update a supplement field for current month only
  const updateSupplementField = (monthNum, suppIndex, field, value) => {
    if (!plan) return;
    const newPlan = { ...plan };
    const month = newPlan.months?.find(m => m.month_number === monthNum);
    if (month && month.supplements[suppIndex]) {
      month.supplements[suppIndex][field] = value;
    }
    recalcAndUpdate(newPlan);
  };

  // Update patient name
  const updatePatientName = (name) => {
    if (!plan) return;
    const newPlan = { ...plan, patient_name: name };
    setPlan(newPlan);
    debouncedSave(newPlan);
  };

  // Export PDFs
  const handleExportPatient = async () => {
    setExporting(true);
    try {
      // Save first
      await savePlan(plan);
      const blob = await exportPatientPDF(planId);
      downloadBlob(blob, `${plan.patient_name || 'patient'}_protocol.pdf`);
      toast.success('Patient PDF exported');
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleExportHC = async () => {
    setExporting(true);
    try {
      await savePlan(plan);
      const blob = await exportHCPDF(planId);
      downloadBlob(blob, `${plan.patient_name || 'patient'}_protocol_HC.pdf`);
      toast.success('HC PDF exported');
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  // Add month
  const addMonth = () => {
    if (!plan) return;
    const newPlan = { ...plan };
    const lastMonth = newPlan.months?.[newPlan.months.length - 1];
    const newNum = (lastMonth?.month_number || 0) + 1;
    const supps = (lastMonth?.supplements || []).map(s => ({ ...s }));
    newPlan.months = [...(newPlan.months || []), { month_number: newNum, supplements: supps, monthly_total_cost: 0 }];
    recalcAndUpdate(newPlan);
    setActiveMonth(String(newNum));
  };

  // Remove month
  const removeMonth = (monthNum) => {
    if (!plan || (plan.months?.length || 0) <= 1) return;
    const newPlan = { ...plan };
    newPlan.months = (newPlan.months || []).filter(m => m.month_number !== monthNum);
    recalcAndUpdate(newPlan);
    if (String(monthNum) === activeMonth && newPlan.months.length > 0) {
      setActiveMonth(String(newPlan.months[0].month_number));
    }
  };

  const filteredSupplements = supplements.filter(s =>
    s.supplement_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[hsl(187,79%,23%)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!plan) return null;

  const programTotal = plan.total_program_cost || 0;

  return (
    <div className="p-6 max-w-[1560px] mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="gap-2 text-muted-foreground"
          >
            <ArrowLeft size={16} />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <Input
                value={plan.patient_name || ''}
                onChange={(e) => updatePatientName(e.target.value)}
                className="text-lg font-semibold border-none bg-transparent px-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 tracking-[-0.01em] max-w-[300px]"
                placeholder="Patient name"
                data-testid="plan-editor-patient-name"
              />
              <Badge variant="secondary" className="bg-[#EEF1F1] text-[#61746E] text-xs">
                {plan.status || 'draft'}
              </Badge>
              {saving && <span className="text-xs text-muted-foreground">Saving...</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 pl-0.5">
              {plan.program_name} / {plan.step_label || `Step ${plan.step_number}`} / {plan.date}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCosts(!showCosts)}
            className="gap-2 text-xs"
            data-testid="plan-editor-toggle-costs"
          >
            <Eye size={14} />
            {showCosts ? 'Hide Costs' : 'Show Costs'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPatient}
            disabled={exporting}
            className="gap-2 text-xs"
            data-testid="plan-editor-export-patient-pdf"
          >
            <Download size={14} /> Patient PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportHC}
            disabled={exporting}
            className="gap-2 text-xs"
            data-testid="plan-editor-export-hc-pdf"
          >
            <FileText size={14} /> HC PDF
          </Button>
          <Button
            size="sm"
            onClick={() => savePlan(plan)}
            disabled={saving}
            className="gap-2 text-xs"
            data-testid="plan-editor-save-button"
          >
            <Save size={14} /> {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Month tabs */}
          <Tabs value={activeMonth} onValueChange={setActiveMonth} data-testid="plan-editor-month-tabs">
            <div className="flex items-center gap-2 mb-4">
              <TabsList className="bg-[#EEF1F1]">
                {(plan.months || []).map(m => (
                  <TabsTrigger
                    key={m.month_number}
                    value={String(m.month_number)}
                    className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    Month {m.month_number}
                  </TabsTrigger>
                ))}
              </TabsList>
              <Button
                variant="ghost"
                size="sm"
                onClick={addMonth}
                className="h-8 gap-1 text-xs text-muted-foreground"
                data-testid="plan-editor-add-month"
              >
                <Plus size={14} /> Month
              </Button>
              {(plan.months?.length || 0) > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMonth(Number(activeMonth))}
                  className="h-8 gap-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>

            {(plan.months || []).map(month => (
              <TabsContent key={month.month_number} value={String(month.month_number)}>
                {/* Supplement table */}
                <div className="rounded-xl border bg-card shadow-[var(--shadow-sm)]">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground w-[240px]">Supplement</TableHead>
                        <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground w-[70px] text-center">Qty</TableHead>
                        <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground w-[70px] text-center">Freq/Day</TableHead>
                        <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground w-[140px]">Dosage Display</TableHead>
                        <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground w-[160px]">Instructions</TableHead>
                        {showCosts && (
                          <>
                            <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground w-[70px] text-center">Bottles</TableHead>
                            <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground w-[90px] text-right">Cost</TableHead>
                          </>
                        )}
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(month.supplements || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={showCosts ? 8 : 6} className="h-24 text-center text-muted-foreground text-sm">
                            No supplements added. Use the search below to add.
                          </TableCell>
                        </TableRow>
                      ) : (
                        (month.supplements || []).map((supp, idx) => (
                          <TableRow key={idx} className="hover:bg-[var(--table-zebra)] group">
                            <TableCell className="py-2">
                              <div className="flex items-center gap-2">
                                <div>
                                  <div className="text-sm font-medium text-[#0B0D10] leading-tight">{supp.supplement_name}</div>
                                  <div className="text-[10px] text-muted-foreground">{supp.company}</div>
                                </div>
                                {supp.refrigerate && (
                                  <Snowflake size={12} className="text-blue-500 shrink-0" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-2">
                              <Input
                                type="number"
                                min={0}
                                value={supp.quantity_per_dose ?? ''}
                                onChange={(e) => updateSupplementField(month.month_number, idx, 'quantity_per_dose', e.target.value ? parseInt(e.target.value) : null)}
                                className="h-8 text-center font-mono text-sm w-full border-border/50 focus:border-[hsl(187,79%,23%)]"
                                data-testid={`supp-qty-${idx}`}
                              />
                            </TableCell>
                            <TableCell className="py-2">
                              <Input
                                type="number"
                                min={0}
                                value={supp.frequency_per_day ?? ''}
                                onChange={(e) => updateSupplementField(month.month_number, idx, 'frequency_per_day', e.target.value ? parseInt(e.target.value) : null)}
                                className="h-8 text-center font-mono text-sm w-full border-border/50 focus:border-[hsl(187,79%,23%)]"
                                data-testid={`supp-freq-${idx}`}
                              />
                            </TableCell>
                            <TableCell className="py-2">
                              <Input
                                value={supp.dosage_display || ''}
                                onChange={(e) => updateSupplementField(month.month_number, idx, 'dosage_display', e.target.value)}
                                className="h-8 text-sm w-full border-border/50"
                                placeholder="e.g., 2 caps 3x/day"
                              />
                            </TableCell>
                            <TableCell className="py-2">
                              <Input
                                value={supp.instructions || ''}
                                onChange={(e) => updateSupplementField(month.month_number, idx, 'instructions', e.target.value)}
                                className="h-8 text-sm w-full border-border/50"
                                placeholder="With food"
                              />
                            </TableCell>
                            {showCosts && (
                              <>
                                <TableCell className="py-2 text-center font-mono tabular-nums text-sm">
                                  {supp.bottles_needed || '-'}
                                </TableCell>
                                <TableCell className="py-2 text-right font-mono tabular-nums text-sm font-medium text-[#147D5A]">
                                  {formatCurrency(supp.calculated_cost)}
                                </TableCell>
                              </>
                            )}
                            <TableCell className="py-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteRow(idx)}
                              >
                                <Trash2 size={13} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>

                  {/* Add supplement search */}
                  <div className="p-3 border-t border-border/50">
                    <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-xs text-muted-foreground w-full justify-start"
                          data-testid="plan-editor-add-row-button"
                        >
                          <Plus size={14} /> Add supplement...
                          <ChevronsUpDown size={12} className="ml-auto" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command data-testid="plan-editor-supplement-typeahead">
                          <CommandInput
                            placeholder="Search supplements..."
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                          />
                          <CommandList>
                            <CommandEmpty>No supplements found.</CommandEmpty>
                            <CommandGroup className="max-h-[280px] overflow-y-auto">
                              {filteredSupplements.slice(0, 30).map(supp => (
                                <CommandItem
                                  key={supp._id}
                                  value={supp.supplement_name}
                                  onSelect={() => addSupplement(supp)}
                                  className="flex items-center justify-between cursor-pointer"
                                >
                                  <div>
                                    <div className="text-sm font-medium">{supp.supplement_name}</div>
                                    <div className="text-xs text-muted-foreground">{supp.company}</div>
                                  </div>
                                  <span className="text-xs font-mono text-muted-foreground">
                                    {formatCurrency(supp.cost_per_bottle)}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Monthly total */}
                {showCosts && (
                  <div className="flex justify-end mt-3 pr-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Monthly total: </span>
                      <span className="font-mono tabular-nums font-semibold text-[#147D5A]">
                        {formatCurrency(month.monthly_total_cost)}
                      </span>
                    </div>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Right Inspector - Cost Summary */}
        {showCosts && (
          <div className="w-[320px] shrink-0">
            <div className="sticky top-6">
              <div className="rounded-xl border bg-card shadow-[var(--shadow-sm)] p-5" data-testid="plan-editor-cost-summary">
                <h3 className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground mb-4">
                  Cost Summary
                </h3>
                <div className="space-y-3">
                  {(plan.months || []).map(month => (
                    <div key={month.month_number} className="flex items-center justify-between text-sm">
                      <span className={`${String(month.month_number) === activeMonth ? 'font-medium text-[#0B0D10]' : 'text-muted-foreground'}`}>
                        Month {month.month_number}
                      </span>
                      <span className="font-mono tabular-nums font-medium">
                        {formatCurrency(month.monthly_total_cost)}
                      </span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#0B0D10]">Program Total</span>
                    <span className="font-mono tabular-nums text-lg font-bold text-[#147D5A]" data-testid="cost-summary-total-value">
                      {formatCurrency(programTotal)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-xl bg-[hsl(174,35%,93%)] border border-[hsl(187,79%,23%)]/10">
                <p className="text-xs text-[hsl(187,79%,23%)]">
                  Cost is visible to HC only. Patient PDFs exclude all cost information.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Row Dialog */}
      <AlertDialog open={deleteRow !== null} onOpenChange={() => setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove supplement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the supplement from all months in this step.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeSupplement(deleteRow)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
