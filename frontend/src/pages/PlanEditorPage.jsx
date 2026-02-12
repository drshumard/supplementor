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

/* ─────────────────────────────────────────────────────────── */
/*  Month Page                                                 */
/* ─────────────────────────────────────────────────────────── */
function MonthPage({
  month, showCosts, patientView, isFinalized,
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
      className="rounded-2xl border border-border/40 bg-white shadow-sm mb-10 overflow-hidden"
      data-testid={`month-page-${month.month_number}`}
    >
      {/* Month header — warm amber tinted */}
      <div className="flex items-center justify-between px-8 py-5 bg-[#FFF8F0] border-b border-[#F5E6D3]">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#E8740C] flex items-center justify-center shadow-sm">
            <Calendar size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0B0D10] tracking-[-0.01em]">
              Month {month.month_number}
            </h3>
            <p className="text-xs text-[#8B7355] mt-0.5">
              {(month.supplements || []).length} supplement{(month.supplements || []).length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {showCosts && !patientView && (
          <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-xl border border-[#E8D5B8] shadow-sm">
            <span className="text-xs text-[#8B7355] font-semibold uppercase tracking-wider">Monthly Total</span>
            <span className="font-mono tabular-nums text-lg font-bold text-[#147D5A]">
              {formatCurrency(month.monthly_total_cost)}
            </span>
          </div>
        )}
      </div>

      {/* Column headers */}
      <div className="grid items-center px-8 py-4 border-b border-border/30 bg-[#FAFAFA]"
        style={{
          gridTemplateColumns: patientView
            ? '2.2fr 1.2fr 1.8fr 1.8fr'
            : showCosts
              ? '2.2fr 0.6fr 0.6fr 1.2fr 1.8fr 0.6fr 0.8fr 0.3fr'
              : '2.2fr 0.6fr 0.6fr 1.2fr 1.8fr 0.3fr'
        }}>
        <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">Supplement</span>
        {!patientView && (
          <>
            <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">Qty</span>
            <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">x/Day</span>
          </>
        )}
        <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">Dosage</span>
        <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">Instructions</span>
        {showCosts && !patientView && (
          <>
            <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">Bottles</span>
            <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">Cost</span>
          </>
        )}
        {!isFinalized && !patientView && <span></span>}
      </div>

      {/* Rows */}
      <div>
        {(month.supplements || []).length === 0 ? (
          <div className="px-8 py-16 text-center text-muted-foreground text-sm">
            No supplements added yet. {!isFinalized ? 'Use the button below to add.' : ''}
          </div>
        ) : (
          (month.supplements || []).map((supp, idx) => (
            <div
              key={idx}
              className="grid items-center px-8 py-5 border-b border-border/15 last:border-b-0 hover:bg-[#FFFBF5] transition-colors duration-150 group"
              style={{
                gridTemplateColumns: patientView
                  ? '2.2fr 1.2fr 1.8fr 1.8fr'
                  : showCosts
                    ? '2.2fr 0.6fr 0.6fr 1.2fr 1.8fr 0.6fr 0.8fr 0.3fr'
                    : '2.2fr 0.6fr 0.6fr 1.2fr 1.8fr 0.3fr'
              }}
            >
              {/* Supplement name — left aligned */}
              <div className="flex items-center gap-3 pr-4">
                <div>
                  <div className="text-sm font-semibold text-[#0B0D10] leading-snug">{supp.supplement_name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{supp.company}</div>
                </div>
                {supp.refrigerate && <Snowflake size={14} className="text-blue-500 shrink-0" />}
              </div>

              {!patientView && (
                <>
                  <div>
                    <Input type="number" min={0}
                      value={supp.quantity_per_dose ?? ''}
                      onChange={(e) => onUpdateField(month.month_number, idx, 'quantity_per_dose', e.target.value ? parseInt(e.target.value) : null)}
                      className="h-10 w-16 text-center font-mono text-sm border-border/50 rounded-lg"
                      disabled={isFinalized} />
                  </div>
                  <div>
                    <Input type="number" min={0}
                      value={supp.frequency_per_day ?? ''}
                      onChange={(e) => onUpdateField(month.month_number, idx, 'frequency_per_day', e.target.value ? parseInt(e.target.value) : null)}
                      className="h-10 w-16 text-center font-mono text-sm border-border/50 rounded-lg"
                      disabled={isFinalized} />
                  </div>
                </>
              )}

              <div className="pr-2">
                {patientView ? (
                  <span className="text-sm">{supp.dosage_display || '-'}</span>
                ) : (
                  <Input value={supp.dosage_display || ''}
                    onChange={(e) => onUpdateField(month.month_number, idx, 'dosage_display', e.target.value)}
                    className="h-10 text-sm w-full border-border/50 rounded-lg"
                    placeholder="2 caps 3x/day" disabled={isFinalized} />
                )}
              </div>

              <div className="pr-2">
                {patientView ? (
                  <span className="text-sm text-muted-foreground italic">{supp.instructions || '-'}</span>
                ) : (
                  <Input value={supp.instructions || ''}
                    onChange={(e) => onUpdateField(month.month_number, idx, 'instructions', e.target.value)}
                    className="h-10 text-sm w-full border-border/50 rounded-lg"
                    placeholder="With food" disabled={isFinalized} />
                )}
              </div>

              {showCosts && !patientView && (
                <>
                  <div className="font-mono tabular-nums text-sm font-semibold text-[#2B3437]">
                    {supp.bottles_needed || '-'}
                  </div>
                  <div className="font-mono tabular-nums text-sm font-bold text-[#147D5A]">
                    {formatCurrency(supp.calculated_cost)}
                  </div>
                </>
              )}

              {!isFinalized && !patientView && (
                <div>
                  <Button variant="ghost" size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg"
                    onClick={() => setDeleteRow(idx)}>
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
              <Button variant="outline" size="sm" className="gap-2.5 text-sm text-muted-foreground w-full justify-start h-12 rounded-xl border-dashed border-border/60 hover:border-[#E8740C]/40 hover:bg-[#FFF8F0]"
                data-testid={`month-${month.month_number}-add-supplement`}>
                <Plus size={16} className="text-[#E8740C]" /> Add supplement to Month {month.month_number}...
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

      {/* Delete Dialog */}
      <AlertDialog open={deleteRow !== null} onOpenChange={() => setDeleteRow(null)}>
        <AlertDialogContent className="p-7">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Remove supplement?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm mt-2">This only removes it from Month {month.month_number}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel className="h-10 px-5">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { onRemoveRow(month.month_number, deleteRow); setDeleteRow(null); }}
              className="bg-[#C53030] text-white hover:bg-[#9B2C2C] h-10 px-5 font-semibold">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


/* ─────────────────────────────────────────────────────────── */
/*  Main Plan Editor                                           */
/* ─────────────────────────────────────────────────────────── */
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

  useEffect(() => {
    const load = async () => {
      try {
        const [p, s] = await Promise.all([getPlan(planId), getSupplements('', true)]);
        setPlan(p); setSupplements(s.supplements || []);
      } catch (err) { toast.error('Failed to load plan'); navigate('/'); }
      finally { setLoading(false); }
    };
    load();
  }, [planId, navigate]);

  const savePlan = useCallback(async (planData) => {
    if (!planData || !planId || planData.status === 'finalized') return;
    setSaving(true);
    try {
      const result = await updatePlan(planId, { patient_name: planData.patient_name, date: planData.date, months: planData.months });
      setPlan(prev => ({ ...prev, ...result }));
    } catch (err) { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }, [planId]);

  const debouncedSave = useCallback((planData) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => savePlan(planData), 800);
  }, [savePlan]);

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

  const addSupplementToMonth = (monthNum, supp) => {
    if (!plan || isFinalized) return;
    const newPlan = { ...plan };
    const month = newPlan.months?.find(m => m.month_number === monthNum);
    if (!month) return;
    month.supplements = [...(month.supplements || []), {
      supplement_id: supp._id, supplement_name: supp.supplement_name, company: supp.company || '',
      quantity_per_dose: supp.default_quantity_per_dose || null, frequency_per_day: supp.default_frequency_per_day || null,
      dosage_display: supp.default_dosage_display || '', instructions: supp.default_instructions || '',
      with_food: supp.default_instructions?.toLowerCase().includes('food') || false, hc_notes: '',
      units_per_bottle: supp.units_per_bottle || null, cost_per_bottle: supp.cost_per_bottle || 0,
      refrigerate: supp.refrigerate || false, bottles_needed: null, calculated_cost: null,
      bottles_per_month_override: supp.bottles_per_month || null,
    }];
    recalcAndUpdate(newPlan);
    toast.success(`Added ${supp.supplement_name} to Month ${monthNum}`);
  };

  const addSupplementToAllMonths = (supp) => {
    if (!plan || isFinalized) return;
    const newPlan = { ...plan };
    const entry = {
      supplement_id: supp._id, supplement_name: supp.supplement_name, company: supp.company || '',
      quantity_per_dose: supp.default_quantity_per_dose || null, frequency_per_day: supp.default_frequency_per_day || null,
      dosage_display: supp.default_dosage_display || '', instructions: supp.default_instructions || '',
      with_food: supp.default_instructions?.toLowerCase().includes('food') || false, hc_notes: '',
      units_per_bottle: supp.units_per_bottle || null, cost_per_bottle: supp.cost_per_bottle || 0,
      refrigerate: supp.refrigerate || false, bottles_needed: null, calculated_cost: null,
      bottles_per_month_override: supp.bottles_per_month || null,
    };
    for (const month of newPlan.months || []) { month.supplements = [...(month.supplements || []), { ...entry }]; }
    recalcAndUpdate(newPlan);
    toast.success(`Added ${supp.supplement_name} to all months`);
  };

  const removeRow = (monthNum, index) => {
    if (!plan || isFinalized) return;
    const newPlan = { ...plan };
    const month = newPlan.months?.find(m => m.month_number === monthNum);
    if (month) { month.supplements = (month.supplements || []).filter((_, i) => i !== index); }
    recalcAndUpdate(newPlan);
    toast.success('Supplement removed');
  };

  const updateField = (monthNum, suppIndex, field, value) => {
    if (!plan || isFinalized) return;
    const newPlan = { ...plan };
    const month = newPlan.months?.find(m => m.month_number === monthNum);
    if (month && month.supplements[suppIndex]) { month.supplements[suppIndex][field] = value; }
    recalcAndUpdate(newPlan);
  };

  const updatePatientName = (name) => {
    if (!plan || isFinalized) return;
    const newPlan = { ...plan, patient_name: name };
    setPlan(newPlan); debouncedSave(newPlan);
  };

  const handleExportPatient = async () => {
    setExporting(true);
    try { if (!isFinalized) await savePlan(plan); const blob = await exportPatientPDF(planId); downloadBlob(blob, `${plan.patient_name || 'patient'}_protocol.pdf`); toast.success('Patient PDF exported'); }
    catch (err) { toast.error('Export failed'); } finally { setExporting(false); }
  };
  const handleExportHC = async () => {
    setExporting(true);
    try { if (!isFinalized) await savePlan(plan); const blob = await exportHCPDF(planId); downloadBlob(blob, `${plan.patient_name || 'patient'}_protocol_HC.pdf`); toast.success('HC PDF exported'); }
    catch (err) { toast.error('Export failed'); } finally { setExporting(false); }
  };
  const handleFinalize = async () => {
    try { await savePlan(plan); const result = await finalizePlan(planId); setPlan(prev => ({ ...prev, ...result })); toast.success('Plan finalized'); setConfirmFinalize(false); }
    catch (err) { toast.error('Failed to finalize'); }
  };
  const handleReopen = async () => {
    try { const result = await reopenPlan(planId); setPlan(prev => ({ ...prev, ...result })); toast.success('Plan reopened'); }
    catch (err) { toast.error('Failed to reopen'); }
  };
  const handleDuplicate = async () => {
    try { const result = await duplicatePlan(planId); toast.success('Plan duplicated'); navigate(`/plans/${result._id}`); }
    catch (err) { toast.error('Failed to duplicate'); }
  };

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

  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const globalFiltered = supplements.filter(s =>
    s.supplement_name.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
    s.company?.toLowerCase().includes(globalSearchQuery.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[#E8740C] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!plan) return null;

  const programTotal = plan.total_program_cost || 0;

  return (
    <div className="p-10 max-w-[1560px] mx-auto">
      {/* Finalized Banner — amber */}
      {isFinalized && (
        <div className="mb-8 rounded-2xl bg-[#FFF8E1] border border-[#F5D680] p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#F5A623] flex items-center justify-center shadow-sm">
            <Lock size={18} className="text-white" />
          </div>
          <div>
            <span className="text-sm text-[#7A5C1F] font-bold">This plan is finalized and locked.</span>
            <p className="text-xs text-[#A08040] mt-0.5">No edits are possible. Reopen to make changes.</p>
          </div>
          <div className="ml-auto flex gap-3">
            <Button onClick={handleReopen} className="gap-2 h-11 px-5 text-sm font-semibold bg-[#F5A623] hover:bg-[#E09410] text-white shadow-sm"><Unlock size={15} /> Reopen</Button>
            <Button variant="outline" onClick={handleDuplicate} className="gap-2 h-11 px-5 text-sm font-semibold"><Copy size={15} /> Duplicate</Button>
          </div>
        </div>
      )}

      {/* Patient View Banner — blue */}
      {patientViewMode && (
        <div className="mb-8 rounded-2xl bg-[#EBF5FF] border border-[#B3D4F0] p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#2B6CB0] flex items-center justify-center shadow-sm">
            <User size={18} className="text-white" />
          </div>
          <div>
            <span className="text-sm text-[#2B6CB0] font-bold">Patient View</span>
            <p className="text-xs text-[#4A90C4] mt-0.5">Costs and internal data are hidden.</p>
          </div>
          <Button onClick={() => setPatientViewMode(false)} className="ml-auto h-11 px-5 text-sm font-semibold bg-[#2B6CB0] hover:bg-[#225895] text-white">Exit Patient View</Button>
        </div>
      )}

      {/* ── Patient Header — BIG, centered ── */}
      <div className="text-center mb-6 relative">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="absolute left-0 top-1 text-muted-foreground h-11 w-11 p-0 rounded-xl hover:bg-[#EEF1F1]">
          <ArrowLeft size={20} />
        </Button>
        <Input
          value={plan.patient_name || ''}
          onChange={(e) => updatePatientName(e.target.value)}
          className="text-3xl font-bold border-none bg-transparent h-auto focus-visible:ring-0 focus-visible:ring-offset-0 tracking-[-0.03em] text-center max-w-[500px] mx-auto"
          placeholder="Patient name"
          data-testid="plan-editor-patient-name"
          disabled={isFinalized}
        />
        <div className="flex items-center justify-center gap-3 mt-2">
          <Badge className={`px-4 py-1.5 text-xs font-bold ${isFinalized ? 'bg-[#147D5A] text-white hover:bg-[#147D5A]' : 'bg-[#FFF3E0] text-[#E8740C] border border-[#F5D6A8] hover:bg-[#FFF3E0]'}`}>
            {plan.status || 'draft'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {plan.program_name} / {plan.step_label || `Step ${plan.step_number}`} / {plan.date}
            {plan.created_by_name ? ` / by ${plan.created_by_name}` : ''}
          </span>
          {saving && <span className="text-xs text-[#E8740C] animate-pulse font-semibold">Saving...</span>}
        </div>
      </div>

      {/* ── Action buttons — colorful row ── */}
      <div className="flex items-center justify-center gap-3 mb-10 flex-wrap">
        {!patientViewMode && (
          <>
            <Button onClick={() => setPatientViewMode(true)}
              className="gap-2 h-11 px-5 text-sm font-semibold bg-[#2B6CB0] hover:bg-[#225895] text-white shadow-sm"
              data-testid="plan-editor-patient-view-toggle">
              <User size={16} /> Patient View
            </Button>
            <Button variant="outline" onClick={() => setShowCosts(!showCosts)}
              className="gap-2 h-11 px-5 text-sm font-semibold bg-white border-border"
              data-testid="plan-editor-toggle-costs">
              {showCosts ? <EyeOff size={16} /> : <Eye size={16} />}
              {showCosts ? 'Hide Costs' : 'Show Costs'}
            </Button>
          </>
        )}
        <Button onClick={handleExportPatient} disabled={exporting}
          className="gap-2 h-11 px-5 text-sm font-semibold bg-[#E8740C] hover:bg-[#D06508] text-white shadow-sm"
          data-testid="plan-editor-export-patient-pdf">
          <Download size={16} /> Patient PDF
        </Button>
        {!patientViewMode && (
          <Button onClick={handleExportHC} disabled={exporting}
            className="gap-2 h-11 px-5 text-sm font-semibold bg-[#0B0D10] hover:bg-[#1a1d21] text-white shadow-sm"
            data-testid="plan-editor-export-hc-pdf">
            <FileText size={16} /> HC PDF
          </Button>
        )}
        {!isFinalized && !patientViewMode && (
          <>
            <Button variant="outline" onClick={handleDuplicate} className="gap-2 h-11 px-5 text-sm font-semibold"><Copy size={16} /> Duplicate</Button>
            <Button onClick={() => setConfirmFinalize(true)}
              className="gap-2 h-11 px-5 text-sm font-bold bg-[#F5A623] hover:bg-[#E09410] text-white shadow-sm"
              data-testid="plan-editor-finalize-button">
              <Lock size={16} /> Finalize
            </Button>
            <Button onClick={() => savePlan(plan)} disabled={saving}
              className="gap-2 h-11 px-6 text-sm font-bold bg-[#0D5F68] hover:bg-[#0A4E55] text-white shadow-sm"
              data-testid="plan-editor-save-button">
              <Save size={16} /> {saving ? 'Saving...' : 'Save'}
            </Button>
          </>
        )}
      </div>

      <div className="flex gap-8">
        <div className="flex-1 min-w-0">
          {/* Quick actions bar */}
          {!isFinalized && !patientViewMode && (
            <div className="flex items-center gap-3 mb-8 p-5 rounded-2xl bg-[#FFF8F0] border border-[#F5E6D3]">
              <Popover open={globalSearchOpen} onOpenChange={setGlobalSearchOpen}>
                <PopoverTrigger asChild>
                  <Button className="gap-2.5 h-11 px-5 text-sm font-semibold bg-[#E8740C] hover:bg-[#D06508] text-white shadow-sm"
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
                            <div><div className="text-sm font-medium">{supp.supplement_name}</div><div className="text-xs text-muted-foreground">{supp.company}</div></div>
                            <span className="text-xs font-mono text-muted-foreground ml-4">{formatCurrency(supp.cost_per_bottle)}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button onClick={addMonth}
                className="gap-2 h-11 px-5 text-sm font-semibold bg-[#0B0D10] hover:bg-[#1a1d21] text-white shadow-sm"
                data-testid="plan-editor-add-month">
                <Plus size={16} /> Add Month
              </Button>
              {(plan.months?.length || 0) > 1 && (
                <Button variant="ghost" onClick={() => removeMonth(plan.months[plan.months.length - 1].month_number)}
                  className="gap-2 h-11 px-5 text-sm font-medium text-[#C53030] hover:text-[#9B2C2C] hover:bg-red-50">
                  <Trash2 size={16} /> Remove Last Month
                </Button>
              )}
            </div>
          )}

          {/* Month pages */}
          {(plan.months || []).map((month, idx) => (
            <MonthPage key={month.month_number} month={month}
              showCosts={effectiveShowCosts} patientView={patientViewMode} isFinalized={isFinalized}
              onUpdateField={updateField} onRemoveRow={removeRow} onAddSupplement={addSupplementToMonth}
              supplements={supplements} formatCurrency={formatCurrency} />
          ))}
        </div>

        {/* Cost Summary — warm tinted */}
        {effectiveShowCosts && !patientViewMode && (
          <div className="w-[340px] shrink-0">
            <div className="sticky top-10">
              <div className="rounded-2xl border border-[#F5E6D3] bg-[#FFFCF5] shadow-sm p-7" data-testid="plan-editor-cost-summary">
                <h3 className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#8B7355] mb-6">Cost Summary</h3>
                <div className="space-y-4">
                  {(plan.months || []).map(month => (
                    <div key={month.month_number} className="flex items-center justify-between">
                      <span className="text-sm text-[#8B7355] font-medium">Month {month.month_number}</span>
                      <span className="font-mono tabular-nums text-sm font-bold text-[#0B0D10]">{formatCurrency(month.monthly_total_cost)}</span>
                    </div>
                  ))}
                  <Separator className="bg-[#F0DEC8]" />
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-bold text-[#0B0D10]">Program Total</span>
                    <span className="font-mono tabular-nums text-2xl font-bold text-[#147D5A]" data-testid="cost-summary-total-value">
                      {formatCurrency(programTotal)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-6 p-5 rounded-2xl bg-[#E8F5E9] border border-[#C8E6C9]">
                <p className="text-xs text-[#2E7D32] font-semibold">
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
            <AlertDialogDescription className="text-sm mt-2">Finalizing locks the plan. You can reopen later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel className="h-10 px-5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalize} className="bg-[#F5A623] hover:bg-[#E09410] text-white h-10 px-5 font-semibold">Finalize Plan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
