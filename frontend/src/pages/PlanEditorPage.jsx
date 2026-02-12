import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPlan, updatePlan, getSupplements, exportPatientPDF, exportHCPDF, finalizePlan, reopenPlan, duplicatePlan } from '../lib/api';
import { formatCurrency, recalculateMonthCosts, downloadBlob } from '../lib/utils';
import { useAuth } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
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
  ArrowLeft, Plus, Trash2, Download, FileText, Eye, EyeOff, Save,
  Snowflake, ChevronsUpDown, Lock, Unlock, Copy, User, CopyPlus, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

/* ─────────────────────────────────────────────────────────────── */
/*  Month "Page" Component — one per month, shown vertically       */
/* ─────────────────────────────────────────────────────────────── */
function MonthPage({
  month, monthIndex, totalMonths, showCosts, patientView, isFinalized,
  onUpdateField, onRemoveRow, onAddSupplement, supplements, formatCurrency,
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteRow, setDeleteRow] = useState(null);

  const filtered = supplements.filter(s =>
    s.supplement_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="rounded-xl border bg-card shadow-[var(--shadow-sm)] mb-8"
      data-testid={`month-page-${month.month_number}`}
    >
      {/* Month header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-[#FAFBFB] rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[hsl(187,79%,23%)] flex items-center justify-center">
            <Calendar size={16} className="text-white" />
          </div>
          <div>
            <span className="text-sm font-bold text-[#0B0D10]">
              Month {month.month_number}
            </span>
            <span className="text-xs text-muted-foreground ml-2">
              {(month.supplements || []).length} supplement{(month.supplements || []).length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        {showCosts && !patientView && (
          <div className="flex items-center gap-2 bg-[hsl(147,60%,95%)] px-4 py-2 rounded-lg border border-[hsl(147,60%,85%)]">
            <span className="text-xs text-muted-foreground font-medium">Monthly Total</span>
            <span className="font-mono tabular-nums text-sm font-bold text-[#147D5A]">
              {formatCurrency(month.monthly_total_cost)}
            </span>
          </div>
        )}
      </div>

      {/* Supplement table */}
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground w-[260px] py-3.5 px-5">Supplement</TableHead>
            {!patientView && (
              <>
                <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground w-[65px] text-center py-3.5">Qty</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground w-[65px] text-center py-3.5">x/Day</TableHead>
              </>
            )}
            <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground w-[160px] py-3.5">Dosage</TableHead>
            <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-3.5">Instructions</TableHead>
            {showCosts && !patientView && (
              <>
                <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground w-[60px] text-center py-3.5">Btls</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground w-[90px] text-right py-3.5">Cost</TableHead>
              </>
            )}
            {!isFinalized && !patientView && (
              <TableHead className="w-[44px]"></TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {(month.supplements || []).length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-20 text-center text-muted-foreground text-sm">
                No supplements. {!isFinalized ? 'Add below.' : ''}
              </TableCell>
            </TableRow>
          ) : (
            (month.supplements || []).map((supp, idx) => (
              <TableRow key={idx} className="hover:bg-[var(--table-zebra)] group">
                <TableCell className="py-3 px-5">
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="text-sm font-semibold text-[#0B0D10] leading-tight">{supp.supplement_name}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{supp.company}</div>
                    </div>
                    {supp.refrigerate && <Snowflake size={13} className="text-blue-500 shrink-0" />}
                  </div>
                </TableCell>
                {!patientView && (
                  <>
                    <TableCell className="py-3">
                      <Input
                        type="number" min={0}
                        value={supp.quantity_per_dose ?? ''}
                        onChange={(e) => onUpdateField(month.month_number, idx, 'quantity_per_dose', e.target.value ? parseInt(e.target.value) : null)}
                        className="h-8 text-center font-mono text-xs w-full border-border/50"
                        disabled={isFinalized}
                      />
                    </TableCell>
                    <TableCell className="py-3">
                      <Input
                        type="number" min={0}
                        value={supp.frequency_per_day ?? ''}
                        onChange={(e) => onUpdateField(month.month_number, idx, 'frequency_per_day', e.target.value ? parseInt(e.target.value) : null)}
                        className="h-8 text-center font-mono text-xs w-full border-border/50"
                        disabled={isFinalized}
                      />
                    </TableCell>
                  </>
                )}
                <TableCell className="py-3">
                  {patientView ? (
                    <span className="text-sm">{supp.dosage_display || '-'}</span>
                  ) : (
                    <Input
                      value={supp.dosage_display || ''}
                      onChange={(e) => onUpdateField(month.month_number, idx, 'dosage_display', e.target.value)}
                      className="h-8 text-xs w-full border-border/50"
                      placeholder="e.g., 2 caps 3x/day"
                      disabled={isFinalized}
                    />
                  )}
                </TableCell>
                <TableCell className="py-3">
                  {patientView ? (
                    <span className="text-sm text-muted-foreground italic">{supp.instructions || '-'}</span>
                  ) : (
                    <Input
                      value={supp.instructions || ''}
                      onChange={(e) => onUpdateField(month.month_number, idx, 'instructions', e.target.value)}
                      className="h-8 text-xs w-full border-border/50"
                      placeholder="With food"
                      disabled={isFinalized}
                    />
                  )}
                </TableCell>
                {showCosts && !patientView && (
                  <>
                    <TableCell className="py-3 text-center font-mono tabular-nums text-xs font-medium">
                      {supp.bottles_needed || '-'}
                    </TableCell>
                    <TableCell className="py-3 text-right font-mono tabular-nums text-xs font-semibold text-[#147D5A]">
                      {formatCurrency(supp.calculated_cost)}
                    </TableCell>
                  </>
                )}
                {!isFinalized && !patientView && (
                  <TableCell className="py-3">
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg"
                      onClick={() => setDeleteRow(idx)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Add supplement */}
      {!isFinalized && !patientView && (
        <div className="p-4 border-t border-border/50">
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2.5 text-sm text-muted-foreground w-full justify-start h-10 rounded-lg"
                data-testid={`month-${month.month_number}-add-supplement`}>
                <Plus size={15} /> Add supplement to Month {month.month_number}...
                <ChevronsUpDown size={12} className="ml-auto" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[440px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search supplements..." value={searchQuery} onValueChange={setSearchQuery} />
                <CommandList>
                  <CommandEmpty>No supplements found.</CommandEmpty>
                  <CommandGroup className="max-h-[280px] overflow-y-auto">
                    {filtered.slice(0, 30).map(supp => (
                      <CommandItem key={supp._id} value={supp.supplement_name}
                        onSelect={() => { onAddSupplement(month.month_number, supp); setSearchOpen(false); setSearchQuery(''); }}
                        className="flex items-center justify-between cursor-pointer py-2.5">
                        <div>
                          <div className="text-sm font-medium">{supp.supplement_name}</div>
                          <div className="text-xs text-muted-foreground">{supp.company}</div>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">{formatCurrency(supp.cost_per_bottle)}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Delete Row Dialog */}
      <AlertDialog open={deleteRow !== null} onOpenChange={() => setDeleteRow(null)}>
        <AlertDialogContent className="p-7">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Remove supplement from Month {month.month_number}?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm mt-2">This only removes it from this month.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel className="h-10 px-5">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { onRemoveRow(month.month_number, deleteRow); setDeleteRow(null); }}
              className="bg-red-600 text-white hover:bg-red-700 h-10 px-5 font-semibold">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────── */
/*  Main Plan Editor                                                */
/* ─────────────────────────────────────────────────────────────── */
export default function PlanEditorPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCosts, setShowCosts] = useState(true);
  const [patientViewMode, setPatientViewMode] = useState(false);
  const [supplements, setSupplements] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const saveTimerRef = useRef(null);

  const isFinalized = plan?.status === 'finalized';
  const effectiveShowCosts = patientViewMode ? false : showCosts;

  // Load plan + supplements
  useEffect(() => {
    const load = async () => {
      try {
        const [p, s] = await Promise.all([getPlan(planId), getSupplements('', true)]);
        setPlan(p);
        setSupplements(s.supplements || []);
      } catch (err) {
        toast.error('Failed to load plan');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [planId, navigate]);

  // Save
  const savePlan = useCallback(async (planData) => {
    if (!planData || !planId || planData.status === 'finalized') return;
    setSaving(true);
    try {
      const result = await updatePlan(planId, {
        patient_name: planData.patient_name,
        date: planData.date,
        months: planData.months,
      });
      setPlan(prev => ({ ...prev, ...result }));
    } catch (err) { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }, [planId]);

  const debouncedSave = useCallback((planData) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => savePlan(planData), 800);
  }, [savePlan]);

  // Recalculate
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

  // Add supplement to a SPECIFIC month
  const addSupplementToMonth = (monthNum, supp) => {
    if (!plan || isFinalized) return;
    const newPlan = { ...plan };
    const month = newPlan.months?.find(m => m.month_number === monthNum);
    if (!month) return;
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
    month.supplements = [...(month.supplements || []), entry];
    recalcAndUpdate(newPlan);
    toast.success(`Added ${supp.supplement_name} to Month ${monthNum}`);
  };

  // Add supplement to ALL months
  const addSupplementToAllMonths = (supp) => {
    if (!plan || isFinalized) return;
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
    for (const month of newPlan.months || []) {
      month.supplements = [...(month.supplements || []), { ...entry }];
    }
    recalcAndUpdate(newPlan);
    toast.success(`Added ${supp.supplement_name} to all months`);
  };

  // Remove from specific month
  const removeRow = (monthNum, index) => {
    if (!plan || isFinalized) return;
    const newPlan = { ...plan };
    const month = newPlan.months?.find(m => m.month_number === monthNum);
    if (month) {
      month.supplements = (month.supplements || []).filter((_, i) => i !== index);
    }
    recalcAndUpdate(newPlan);
    toast.success('Supplement removed');
  };

  // Update field
  const updateField = (monthNum, suppIndex, field, value) => {
    if (!plan || isFinalized) return;
    const newPlan = { ...plan };
    const month = newPlan.months?.find(m => m.month_number === monthNum);
    if (month && month.supplements[suppIndex]) {
      month.supplements[suppIndex][field] = value;
    }
    recalcAndUpdate(newPlan);
  };

  const updatePatientName = (name) => {
    if (!plan || isFinalized) return;
    const newPlan = { ...plan, patient_name: name };
    setPlan(newPlan);
    debouncedSave(newPlan);
  };

  // Exports
  const handleExportPatient = async () => {
    setExporting(true);
    try {
      if (!isFinalized) await savePlan(plan);
      const blob = await exportPatientPDF(planId);
      downloadBlob(blob, `${plan.patient_name || 'patient'}_protocol.pdf`);
      toast.success('Patient PDF exported');
    } catch (err) { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const handleExportHC = async () => {
    setExporting(true);
    try {
      if (!isFinalized) await savePlan(plan);
      const blob = await exportHCPDF(planId);
      downloadBlob(blob, `${plan.patient_name || 'patient'}_protocol_HC.pdf`);
      toast.success('HC PDF exported');
    } catch (err) { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const handleFinalize = async () => {
    try {
      await savePlan(plan);
      const result = await finalizePlan(planId);
      setPlan(prev => ({ ...prev, ...result }));
      toast.success('Plan finalized');
      setConfirmFinalize(false);
    } catch (err) { toast.error('Failed to finalize'); }
  };

  const handleReopen = async () => {
    try {
      const result = await reopenPlan(planId);
      setPlan(prev => ({ ...prev, ...result }));
      toast.success('Plan reopened');
    } catch (err) { toast.error('Failed to reopen'); }
  };

  const handleDuplicate = async () => {
    try {
      const result = await duplicatePlan(planId);
      toast.success('Plan duplicated');
      navigate(`/plans/${result._id}`);
    } catch (err) { toast.error('Failed to duplicate'); }
  };

  // Add / remove month
  const addMonth = () => {
    if (!plan || isFinalized) return;
    const newPlan = { ...plan };
    const lastMonth = newPlan.months?.[newPlan.months.length - 1];
    const newNum = (lastMonth?.month_number || 0) + 1;
    const supps = (lastMonth?.supplements || []).map(s => ({ ...s }));
    newPlan.months = [...(newPlan.months || []), { month_number: newNum, supplements: supps, monthly_total_cost: 0 }];
    recalcAndUpdate(newPlan);
  };

  const removeMonth = (monthNum) => {
    if (!plan || isFinalized || (plan.months?.length || 0) <= 1) return;
    const newPlan = { ...plan };
    newPlan.months = (newPlan.months || []).filter(m => m.month_number !== monthNum);
    recalcAndUpdate(newPlan);
  };

  // "Add to all months" search
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const globalFiltered = supplements.filter(s =>
    s.supplement_name.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
    s.company?.toLowerCase().includes(globalSearchQuery.toLowerCase())
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
    <div className="p-8 max-w-[1560px] mx-auto">
      {/* Finalized Banner */}
      {isFinalized && (
        <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
            <Lock size={16} className="text-amber-600" />
          </div>
          <span className="text-sm text-amber-800 font-semibold">This plan is finalized and locked for editing.</span>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReopen} className="gap-2 h-10 px-4 text-sm font-medium border-amber-300 hover:bg-amber-50"><Unlock size={14} /> Reopen</Button>
            <Button variant="outline" size="sm" onClick={handleDuplicate} className="gap-2 h-10 px-4 text-sm font-medium"><Copy size={14} /> Duplicate</Button>
          </div>
        </div>
      )}

      {/* Patient View Banner */}
      {patientViewMode && (
        <div className="mb-6 rounded-xl bg-blue-50 border border-blue-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
            <User size={16} className="text-blue-600" />
          </div>
          <span className="text-sm text-blue-800 font-semibold">Patient View — Costs and internal data are hidden.</span>
          <Button variant="outline" size="sm" onClick={() => setPatientViewMode(false)} className="ml-auto h-10 px-4 text-sm font-medium">Exit Patient View</Button>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-2 text-muted-foreground h-10 w-10 p-0 rounded-lg hover:bg-[#EEF1F1]">
            <ArrowLeft size={18} />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <Input
                value={plan.patient_name || ''}
                onChange={(e) => updatePatientName(e.target.value)}
                className="text-xl font-bold border-none bg-transparent px-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 tracking-[-0.02em] max-w-[340px]"
                placeholder="Patient name"
                data-testid="plan-editor-patient-name"
                disabled={isFinalized}
              />
              <Badge variant={isFinalized ? 'default' : 'secondary'}
                className={`px-3 py-1.5 text-xs font-bold ${isFinalized ? 'bg-emerald-600 text-white hover:bg-emerald-600' : 'bg-[#EEF1F1] text-[#61746E] hover:bg-[#EEF1F1]'}`}>
                {plan.status || 'draft'}
              </Badge>
              {saving && <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-1 pl-0.5">
              {plan.program_name} / {plan.step_label || `Step ${plan.step_number}`} / {plan.date}
              {plan.created_by_name ? ` / by ${plan.created_by_name}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {!patientViewMode && (
            <>
              <Button variant="outline" size="sm" onClick={() => setPatientViewMode(true)}
                className="gap-2 h-10 px-4 text-sm font-medium border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                data-testid="plan-editor-patient-view-toggle">
                <User size={15} /> Patient View
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowCosts(!showCosts)}
                className="gap-2 h-10 px-4 text-sm font-medium"
                data-testid="plan-editor-toggle-costs">
                {showCosts ? <EyeOff size={15} /> : <Eye size={15} />}
                {showCosts ? 'Hide Costs' : 'Show Costs'}
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={handleExportPatient} disabled={exporting}
            className="gap-2 h-10 px-4 text-sm font-medium border-[hsl(187,79%,23%)]/30 text-[hsl(187,79%,23%)] hover:bg-[hsl(174,35%,93%)]"
            data-testid="plan-editor-export-patient-pdf">
            <Download size={15} /> Patient PDF
          </Button>
          {!patientViewMode && (
            <Button variant="outline" size="sm" onClick={handleExportHC} disabled={exporting}
              className="gap-2 h-10 px-4 text-sm font-medium border-[hsl(187,79%,23%)]/30 text-[hsl(187,79%,23%)] hover:bg-[hsl(174,35%,93%)]"
              data-testid="plan-editor-export-hc-pdf">
              <FileText size={15} /> HC PDF
            </Button>
          )}
          {!isFinalized && !patientViewMode && (
            <>
              <Button variant="outline" size="sm" onClick={handleDuplicate} className="gap-2 h-10 px-4 text-sm font-medium"><Copy size={15} /> Duplicate</Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmFinalize(true)}
                className="gap-2 h-10 px-4 text-sm font-semibold border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
                data-testid="plan-editor-finalize-button">
                <Lock size={15} /> Finalize
              </Button>
              <Button size="sm" onClick={() => savePlan(plan)} disabled={saving}
                className="gap-2 h-10 px-5 text-sm font-semibold bg-[hsl(187,79%,23%)] hover:bg-[hsl(187,79%,28%)] text-white shadow-sm"
                data-testid="plan-editor-save-button">
                <Save size={15} /> {saving ? 'Saving...' : 'Save'}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-7">
        {/* Main content — all months stacked vertically */}
        <div className="flex-1 min-w-0">
          {/* Quick actions */}
          {!isFinalized && !patientViewMode && (
            <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-[#F9FAFA] border border-border/40">
              {/* Add to all months */}
              <Popover open={globalSearchOpen} onOpenChange={setGlobalSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm"
                    className="gap-2.5 h-10 px-4 text-sm font-medium bg-white"
                    data-testid="plan-editor-add-all-months">
                    <CopyPlus size={15} /> Add to all months
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[440px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search supplements..." value={globalSearchQuery} onValueChange={setGlobalSearchQuery} />
                    <CommandList>
                      <CommandEmpty>No supplements found.</CommandEmpty>
                      <CommandGroup className="max-h-[280px] overflow-y-auto">
                        {globalFiltered.slice(0, 30).map(supp => (
                          <CommandItem key={supp._id} value={supp.supplement_name}
                            onSelect={() => { addSupplementToAllMonths(supp); setGlobalSearchOpen(false); setGlobalSearchQuery(''); }}
                            className="flex items-center justify-between cursor-pointer py-2.5">
                            <div>
                              <div className="text-sm font-medium">{supp.supplement_name}</div>
                              <div className="text-xs text-muted-foreground">{supp.company}</div>
                            </div>
                            <span className="text-xs font-mono text-muted-foreground">{formatCurrency(supp.cost_per_bottle)}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="sm" onClick={addMonth}
                className="gap-2 h-10 px-4 text-sm font-medium bg-white"
                data-testid="plan-editor-add-month">
                <Plus size={15} /> Add Month
              </Button>
              {(plan.months?.length || 0) > 1 && (
                <Button variant="ghost" size="sm"
                  onClick={() => removeMonth(plan.months[plan.months.length - 1].month_number)}
                  className="gap-2 h-10 px-4 text-sm font-medium text-muted-foreground hover:text-red-500 hover:bg-red-50">
                  <Trash2 size={15} /> Remove Last Month
                </Button>
              )}
            </div>
          )}

          {/* Month pages — stacked vertically */}
          {(plan.months || []).map((month, idx) => (
            <MonthPage
              key={month.month_number}
              month={month}
              monthIndex={idx}
              totalMonths={(plan.months || []).length}
              showCosts={effectiveShowCosts}
              patientView={patientViewMode}
              isFinalized={isFinalized}
              onUpdateField={updateField}
              onRemoveRow={removeRow}
              onAddSupplement={addSupplementToMonth}
              supplements={supplements}
              formatCurrency={formatCurrency}
            />
          ))}
        </div>

        {/* Right panel — Cost Summary (sticky) */}
        {effectiveShowCosts && !patientViewMode && (
          <div className="w-[320px] shrink-0">
            <div className="sticky top-8">
              <div className="rounded-xl border bg-card shadow-[var(--shadow-sm)] p-6" data-testid="plan-editor-cost-summary">
                <h3 className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground mb-5">Cost Summary</h3>
                <div className="space-y-3">
                  {(plan.months || []).map(month => (
                    <div key={month.month_number} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Month {month.month_number}</span>
                      <span className="font-mono tabular-nums font-semibold">{formatCurrency(month.monthly_total_cost)}</span>
                    </div>
                  ))}
                  <Separator className="my-1" />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm font-bold text-[#0B0D10]">Program Total</span>
                    <span className="font-mono tabular-nums text-xl font-bold text-[#147D5A]" data-testid="cost-summary-total-value">
                      {formatCurrency(programTotal)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-5 p-4 rounded-xl bg-[hsl(174,35%,93%)] border border-[hsl(187,79%,23%)]/10">
                <p className="text-xs text-[hsl(187,79%,23%)] font-medium">
                  Cost visible to HC only. Patient PDFs exclude all cost info.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Finalize Dialog */}
      <AlertDialog open={confirmFinalize} onOpenChange={setConfirmFinalize}>
        <AlertDialogContent className="p-7">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Finalize this plan?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm mt-2">
              Finalizing locks the plan from editing. You can reopen it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel className="h-10 px-5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalize} className="bg-amber-600 hover:bg-amber-700 text-white h-10 px-5 font-semibold">Finalize Plan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
