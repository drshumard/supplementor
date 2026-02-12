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
/*  Month "Page" Component — ultra-spacious, centered layout       */
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
      className="rounded-2xl border bg-card shadow-[var(--shadow-sm)] mb-10 overflow-hidden"
      data-testid={`month-page-${month.month_number}`}
    >
      {/* Month header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-border/40 bg-gradient-to-r from-[#F8FAFA] to-[#F4F7F7]">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[hsl(187,79%,23%)] flex items-center justify-center shadow-sm">
            <Calendar size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0B0D10] tracking-[-0.01em]">
              Month {month.month_number}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {(month.supplements || []).length} supplement{(month.supplements || []).length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {showCosts && !patientView && (
          <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-xl border border-[hsl(147,60%,85%)] shadow-sm">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Monthly Total</span>
            <span className="font-mono tabular-nums text-base font-bold text-[#147D5A]">
              {formatCurrency(month.monthly_total_cost)}
            </span>
          </div>
        )}
      </div>

      {/* Column headers */}
      <div className="grid items-center px-8 py-4 border-b border-border/30 bg-[#FCFCFC]"
        style={{
          gridTemplateColumns: patientView
            ? '2fr 1.2fr 1.5fr 1.5fr'
            : showCosts
              ? '2fr 0.6fr 0.6fr 1.2fr 1.5fr 0.6fr 0.8fr 0.3fr'
              : '2fr 0.6fr 0.6fr 1.2fr 1.5fr 0.3fr'
        }}>
        <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">Supplement</span>
        {!patientView && (
          <>
            <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground text-center">Qty</span>
            <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground text-center">x/Day</span>
          </>
        )}
        <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground text-center">Dosage</span>
        <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground text-center">Instructions</span>
        {showCosts && !patientView && (
          <>
            <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground text-center">Bottles</span>
            <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground text-center">Cost</span>
          </>
        )}
        {!isFinalized && !patientView && <span></span>}
      </div>

      {/* Supplement rows */}
      <div>
        {(month.supplements || []).length === 0 ? (
          <div className="px-8 py-16 text-center text-muted-foreground text-sm">
            No supplements added yet. {!isFinalized ? 'Use the button below to add.' : ''}
          </div>
        ) : (
          (month.supplements || []).map((supp, idx) => (
            <div
              key={idx}
              className="grid items-center px-8 py-6 border-b border-border/20 last:border-b-0 hover:bg-[hsl(174,35%,97%)] transition-colors duration-150 group"
              style={{
                gridTemplateColumns: patientView
                  ? '2fr 1.2fr 1.5fr 1.5fr'
                  : showCosts
                    ? '2fr 0.6fr 0.6fr 1.2fr 1.5fr 0.6fr 0.8fr 0.3fr'
                    : '2fr 0.6fr 0.6fr 1.2fr 1.5fr 0.3fr'
              }}
            >
              {/* Supplement name */}
              <div className="flex items-center gap-3 pr-4">
                <div>
                  <div className="text-sm font-semibold text-[#0B0D10] leading-snug">{supp.supplement_name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{supp.company}</div>
                </div>
                {supp.refrigerate && <Snowflake size={14} className="text-blue-500 shrink-0" />}
              </div>

              {/* Qty & Freq (HC only) */}
              {!patientView && (
                <>
                  <div className="flex justify-center">
                    <Input
                      type="number" min={0}
                      value={supp.quantity_per_dose ?? ''}
                      onChange={(e) => onUpdateField(month.month_number, idx, 'quantity_per_dose', e.target.value ? parseInt(e.target.value) : null)}
                      className="h-10 w-16 text-center font-mono text-sm border-border/50 rounded-lg"
                      disabled={isFinalized}
                    />
                  </div>
                  <div className="flex justify-center">
                    <Input
                      type="number" min={0}
                      value={supp.frequency_per_day ?? ''}
                      onChange={(e) => onUpdateField(month.month_number, idx, 'frequency_per_day', e.target.value ? parseInt(e.target.value) : null)}
                      className="h-10 w-16 text-center font-mono text-sm border-border/50 rounded-lg"
                      disabled={isFinalized}
                    />
                  </div>
                </>
              )}

              {/* Dosage */}
              <div className="flex justify-center px-2">
                {patientView ? (
                  <span className="text-sm text-center">{supp.dosage_display || '-'}</span>
                ) : (
                  <Input
                    value={supp.dosage_display || ''}
                    onChange={(e) => onUpdateField(month.month_number, idx, 'dosage_display', e.target.value)}
                    className="h-10 text-sm text-center w-full border-border/50 rounded-lg"
                    placeholder="2 caps 3x/day"
                    disabled={isFinalized}
                  />
                )}
              </div>

              {/* Instructions */}
              <div className="flex justify-center px-2">
                {patientView ? (
                  <span className="text-sm text-muted-foreground text-center italic">{supp.instructions || '-'}</span>
                ) : (
                  <Input
                    value={supp.instructions || ''}
                    onChange={(e) => onUpdateField(month.month_number, idx, 'instructions', e.target.value)}
                    className="h-10 text-sm text-center w-full border-border/50 rounded-lg"
                    placeholder="With food"
                    disabled={isFinalized}
                  />
                )}
              </div>

              {/* Bottles & Cost (HC only) */}
              {showCosts && !patientView && (
                <>
                  <div className="text-center font-mono tabular-nums text-sm font-semibold text-[#2B3437]">
                    {supp.bottles_needed || '-'}
                  </div>
                  <div className="text-center font-mono tabular-nums text-sm font-bold text-[#147D5A]">
                    {formatCurrency(supp.calculated_cost)}
                  </div>
                </>
              )}

              {/* Delete */}
              {!isFinalized && !patientView && (
                <div className="flex justify-center">
                  <Button
                    variant="ghost" size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg"
                    onClick={() => setDeleteRow(idx)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add supplement */}
      {!isFinalized && !patientView && (
        <div className="px-8 py-5 border-t border-border/30 bg-[#FCFCFC]">
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2.5 text-sm text-muted-foreground w-full justify-start h-12 rounded-xl border-dashed border-border/60 hover:border-[hsl(187,79%,23%)]/40 hover:bg-[hsl(174,35%,97%)]"
                data-testid={`month-${month.month_number}-add-supplement`}>
                <Plus size={16} className="text-[hsl(187,79%,23%)]" /> Add supplement to Month {month.month_number}...
                <ChevronsUpDown size={13} className="ml-auto" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[460px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search supplements..." value={searchQuery} onValueChange={setSearchQuery} />
                <CommandList>
                  <CommandEmpty>No supplements found.</CommandEmpty>
                  <CommandGroup className="max-h-[300px] overflow-y-auto">
                    {filtered.slice(0, 30).map(supp => (
                      <CommandItem key={supp._id} value={supp.supplement_name}
                        onSelect={() => { onAddSupplement(month.month_number, supp); setSearchOpen(false); setSearchQuery(''); }}
                        className="flex items-center justify-between cursor-pointer py-3 px-3">
                        <div>
                          <div className="text-sm font-medium">{supp.supplement_name}</div>
                          <div className="text-xs text-muted-foreground">{supp.company}</div>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground ml-4">{formatCurrency(supp.cost_per_bottle)}</span>
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
    <div className="p-10 max-w-[1560px] mx-auto">
      {/* Finalized Banner */}
      {isFinalized && (
        <div className="mb-8 rounded-2xl bg-amber-50 border border-amber-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
            <Lock size={18} className="text-amber-600" />
          </div>
          <div>
            <span className="text-sm text-amber-800 font-bold">This plan is finalized and locked.</span>
            <p className="text-xs text-amber-600 mt-0.5">No edits are possible. Reopen to make changes.</p>
          </div>
          <div className="ml-auto flex gap-3">
            <Button variant="outline" size="sm" onClick={handleReopen} className="gap-2 h-11 px-5 text-sm font-semibold border-amber-300 hover:bg-amber-50"><Unlock size={15} /> Reopen</Button>
            <Button variant="outline" size="sm" onClick={handleDuplicate} className="gap-2 h-11 px-5 text-sm font-semibold"><Copy size={15} /> Duplicate</Button>
          </div>
        </div>
      )}

      {/* Patient View Banner */}
      {patientViewMode && (
        <div className="mb-8 rounded-2xl bg-blue-50 border border-blue-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
            <User size={18} className="text-blue-600" />
          </div>
          <div>
            <span className="text-sm text-blue-800 font-bold">Patient View</span>
            <p className="text-xs text-blue-600 mt-0.5">Costs and internal data are hidden. This matches what the patient sees.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPatientViewMode(false)} className="ml-auto h-11 px-5 text-sm font-semibold">Exit Patient View</Button>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-start justify-between mb-10">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="mt-1 text-muted-foreground h-11 w-11 p-0 rounded-xl hover:bg-[#EEF1F1]">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-4">
              <Input
                value={plan.patient_name || ''}
                onChange={(e) => updatePatientName(e.target.value)}
                className="text-2xl font-bold border-none bg-transparent px-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 tracking-[-0.02em] max-w-[380px]"
                placeholder="Patient name"
                data-testid="plan-editor-patient-name"
                disabled={isFinalized}
              />
              <Badge variant={isFinalized ? 'default' : 'secondary'}
                className={`px-4 py-1.5 text-xs font-bold ${isFinalized ? 'bg-emerald-600 text-white hover:bg-emerald-600' : 'bg-[#EEF1F1] text-[#61746E] hover:bg-[#EEF1F1]'}`}>
                {plan.status || 'draft'}
              </Badge>
              {saving && <span className="text-xs text-muted-foreground animate-pulse font-medium">Saving...</span>}
            </div>
            <p className="text-sm text-muted-foreground mt-1.5 pl-0.5">
              {plan.program_name} / {plan.step_label || `Step ${plan.step_number}`} / {plan.date}
              {plan.created_by_name ? ` / by ${plan.created_by_name}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {!patientViewMode && (
            <>
              <Button variant="outline" size="sm" onClick={() => setPatientViewMode(true)}
                className="gap-2 h-11 px-5 text-sm font-semibold border-blue-200 text-blue-700 hover:bg-blue-50"
                data-testid="plan-editor-patient-view-toggle">
                <User size={16} /> Patient View
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowCosts(!showCosts)}
                className="gap-2 h-11 px-5 text-sm font-semibold"
                data-testid="plan-editor-toggle-costs">
                {showCosts ? <EyeOff size={16} /> : <Eye size={16} />}
                {showCosts ? 'Hide Costs' : 'Show Costs'}
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={handleExportPatient} disabled={exporting}
            className="gap-2 h-11 px-5 text-sm font-semibold border-[hsl(187,79%,23%)]/30 text-[hsl(187,79%,23%)] hover:bg-[hsl(174,35%,93%)]"
            data-testid="plan-editor-export-patient-pdf">
            <Download size={16} /> Patient PDF
          </Button>
          {!patientViewMode && (
            <Button variant="outline" size="sm" onClick={handleExportHC} disabled={exporting}
              className="gap-2 h-11 px-5 text-sm font-semibold border-[hsl(187,79%,23%)]/30 text-[hsl(187,79%,23%)] hover:bg-[hsl(174,35%,93%)]"
              data-testid="plan-editor-export-hc-pdf">
              <FileText size={16} /> HC PDF
            </Button>
          )}
          {!isFinalized && !patientViewMode && (
            <>
              <Button variant="outline" size="sm" onClick={handleDuplicate} className="gap-2 h-11 px-5 text-sm font-semibold"><Copy size={16} /> Duplicate</Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmFinalize(true)}
                className="gap-2 h-11 px-5 text-sm font-bold border-amber-300 text-amber-700 hover:bg-amber-50"
                data-testid="plan-editor-finalize-button">
                <Lock size={16} /> Finalize
              </Button>
              <Button size="sm" onClick={() => savePlan(plan)} disabled={saving}
                className="gap-2 h-11 px-6 text-sm font-bold bg-[hsl(187,79%,23%)] hover:bg-[hsl(187,79%,28%)] text-white shadow-sm"
                data-testid="plan-editor-save-button">
                <Save size={16} /> {saving ? 'Saving...' : 'Save'}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-8">
        {/* Main content — all months stacked vertically */}
        <div className="flex-1 min-w-0">
          {/* Quick actions */}
          {!isFinalized && !patientViewMode && (
            <div className="flex items-center gap-3 mb-8 p-5 rounded-2xl bg-[#F8FAFA] border border-border/30">
              <Popover open={globalSearchOpen} onOpenChange={setGlobalSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm"
                    className="gap-2.5 h-11 px-5 text-sm font-semibold bg-white shadow-sm"
                    data-testid="plan-editor-add-all-months">
                    <CopyPlus size={16} /> Add to all months
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[460px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search supplements..." value={globalSearchQuery} onValueChange={setGlobalSearchQuery} />
                    <CommandList>
                      <CommandEmpty>No supplements found.</CommandEmpty>
                      <CommandGroup className="max-h-[300px] overflow-y-auto">
                        {globalFiltered.slice(0, 30).map(supp => (
                          <CommandItem key={supp._id} value={supp.supplement_name}
                            onSelect={() => { addSupplementToAllMonths(supp); setGlobalSearchOpen(false); setGlobalSearchQuery(''); }}
                            className="flex items-center justify-between cursor-pointer py-3 px-3">
                            <div>
                              <div className="text-sm font-medium">{supp.supplement_name}</div>
                              <div className="text-xs text-muted-foreground">{supp.company}</div>
                            </div>
                            <span className="text-xs font-mono text-muted-foreground ml-4">{formatCurrency(supp.cost_per_bottle)}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="sm" onClick={addMonth}
                className="gap-2 h-11 px-5 text-sm font-semibold bg-white shadow-sm"
                data-testid="plan-editor-add-month">
                <Plus size={16} /> Add Month
              </Button>
              {(plan.months?.length || 0) > 1 && (
                <Button variant="ghost" size="sm"
                  onClick={() => removeMonth(plan.months[plan.months.length - 1].month_number)}
                  className="gap-2 h-11 px-5 text-sm font-medium text-muted-foreground hover:text-red-500 hover:bg-red-50">
                  <Trash2 size={16} /> Remove Last Month
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
          <div className="w-[340px] shrink-0">
            <div className="sticky top-10">
              <div className="rounded-2xl border bg-card shadow-[var(--shadow-sm)] p-7" data-testid="plan-editor-cost-summary">
                <h3 className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-6">Cost Summary</h3>
                <div className="space-y-4">
                  {(plan.months || []).map(month => (
                    <div key={month.month_number} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground font-medium">Month {month.month_number}</span>
                      <span className="font-mono tabular-nums text-sm font-bold">{formatCurrency(month.monthly_total_cost)}</span>
                    </div>
                  ))}
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-bold text-[#0B0D10]">Program Total</span>
                    <span className="font-mono tabular-nums text-2xl font-bold text-[#147D5A]" data-testid="cost-summary-total-value">
                      {formatCurrency(programTotal)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-6 p-5 rounded-2xl bg-[hsl(174,35%,93%)] border border-[hsl(187,79%,23%)]/10">
                <p className="text-xs text-[hsl(187,79%,23%)] font-semibold">
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
