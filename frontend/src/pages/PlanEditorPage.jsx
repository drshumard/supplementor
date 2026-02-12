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
  ArrowLeft, Plus, Minus, Trash2, Download, FileText, Eye, EyeOff, Save,
  Snowflake, ChevronsUpDown, Lock, Unlock, Copy, User, CopyPlus, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

/* ── Pill-shaped number stepper ── */
function NumberStepper({ value, onChange, disabled, min = 0 }) {
  const num = value ?? 0;
  return (
    <div className="inline-flex items-center h-10 rounded-lg bg-[#D5ECE8] border border-[#C8E6E0] overflow-hidden select-none">
      <button
        type="button"
        disabled={disabled || num <= min}
        onClick={() => onChange(Math.max(min, num - 1))}
        className="w-9 h-full flex items-center justify-center text-[#61746E] hover:bg-[#C8E6E0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Minus size={14} />
      </button>
      <span className="w-9 h-full flex items-center justify-center bg-[#F4F5F5] font-mono text-sm font-bold text-[#0B0D10]">{num}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(num + 1)}
        className="w-9 h-full flex items-center justify-center text-[#61746E] hover:bg-[#C8E6E0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

/* ── Month Page ── */
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
    <div className="rounded-2xl border border-border/40 bg-[#FAFAFA] shadow-sm mb-10 overflow-hidden"
      data-testid={`month-page-${month.month_number}`}>

      {/* Month header */}
      <div className="flex items-center justify-between px-8 py-5 bg-[#EAF4F3] border-b border-[#C8E6E0]">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#0D5F68] flex items-center justify-center shadow-sm">
            <Calendar size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0B0D10]">Month {month.month_number}</h3>
            <p className="text-xs text-[#61746E] mt-0.5">
              {(month.supplements || []).length} supplement{(month.supplements || []).length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {showCosts && !patientView && (
          <div className="flex items-center gap-3 bg-[#FAFAFA] px-5 py-2.5 rounded-xl border border-[#C8E6E0] shadow-sm">
            <span className="text-xs text-[#61746E] font-semibold uppercase tracking-wider">Monthly Total</span>
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
        {!patientView && (<>
          <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground text-center">Qty</span>
          <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground text-center">x/Day</span>
        </>)}
        <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground text-center">Dosage</span>
        <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground text-center">Instructions</span>
        {showCosts && !patientView && (<>
          <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">Bottles</span>
          <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">Cost</span>
        </>)}
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
            <div key={idx}
              className="grid items-center px-8 py-5 border-b border-border/15 last:border-b-0 hover:bg-[#F6FAFA] transition-colors duration-150 group"
              style={{
                gridTemplateColumns: patientView
                  ? '2.2fr 1.2fr 1.8fr 1.8fr'
                  : showCosts
                    ? '2.2fr 0.6fr 0.6fr 1.2fr 1.8fr 0.6fr 0.8fr 0.3fr'
                    : '2.2fr 0.6fr 0.6fr 1.2fr 1.8fr 0.3fr'
              }}>
              <div className="flex items-center gap-3 pr-4">
                <div>
                  <div className="text-sm font-semibold text-[#0B0D10]">{supp.supplement_name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{supp.company}</div>
                </div>
                {supp.refrigerate && <Snowflake size={14} className="text-blue-500 shrink-0" />}
              </div>
              {!patientView && (<>
                <div className="flex justify-center"><NumberStepper value={supp.quantity_per_dose} disabled={isFinalized}
                  onChange={(v) => onUpdateField(month.month_number, idx, 'quantity_per_dose', v)} /></div>
                <div className="flex justify-center"><NumberStepper value={supp.frequency_per_day} disabled={isFinalized}
                  onChange={(v) => onUpdateField(month.month_number, idx, 'frequency_per_day', v)} /></div>
              </>)}
              <div className="pr-2">
                {patientView ? <span className="text-sm">{supp.dosage_display || '-'}</span> :
                  <Input value={supp.dosage_display || ''}
                    onChange={(e) => onUpdateField(month.month_number, idx, 'dosage_display', e.target.value)}
                    className="h-10 text-sm w-full border-border/50 rounded-lg" placeholder="2 caps 3x/day" disabled={isFinalized} />}
              </div>
              <div className="pr-2">
                {patientView ? <span className="text-sm text-muted-foreground italic">{supp.instructions || '-'}</span> :
                  <Input value={supp.instructions || ''}
                    onChange={(e) => onUpdateField(month.month_number, idx, 'instructions', e.target.value)}
                    className="h-10 text-sm w-full border-border/50 rounded-lg" placeholder="With food" disabled={isFinalized} />}
              </div>
              {showCosts && !patientView && (<>
                <div className="font-mono tabular-nums text-sm font-semibold text-[#2B3437]">{supp.bottles_needed || '-'}</div>
                <div className="font-mono tabular-nums text-sm font-bold text-[#147D5A]">{formatCurrency(supp.calculated_cost)}</div>
              </>)}
              {!isFinalized && !patientView && (
                <div>
                  <Button variant="ghost" size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-[#C53B3B] hover:bg-red-50 rounded-lg"
                    onClick={() => setDeleteRow(idx)}><Trash2 size={14} /></Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add supplement */}
      {!isFinalized && !patientView && (
        <div className="px-8 py-5 border-t border-border/30 bg-[#FAFAFA]">
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm"
                className="gap-2.5 text-sm text-muted-foreground w-full justify-start h-12 rounded-xl border-dashed border-border/60 hover:border-[#0D5F68]/40 hover:bg-[#EAF4F3]"
                data-testid={`month-${month.month_number}-add-supplement`}>
                <Plus size={16} className="text-[#0D5F68]" /> Add supplement to Month {month.month_number}...
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
                        <div><div className="text-sm font-medium">{supp.supplement_name}</div><div className="text-xs text-muted-foreground">{supp.company}</div></div>
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

      <AlertDialog open={deleteRow !== null} onOpenChange={() => setDeleteRow(null)}>
        <AlertDialogContent className="p-7">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Remove supplement?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm mt-2">This only removes it from Month {month.month_number}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel className="h-10 px-5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onRemoveRow(month.month_number, deleteRow); setDeleteRow(null); }}
              className="bg-[#C53B3B] text-white hover:bg-[#A52E2E] h-10 px-5 font-semibold">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


/* ── Main Plan Editor ── */
export default function PlanEditorPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCosts, setShowCosts] = useState(false);
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
    try { const result = await updatePlan(planId, { patient_name: planData.patient_name, date: planData.date, months: planData.months }); setPlan(prev => ({ ...prev, ...result })); }
    catch (err) { toast.error('Failed to save'); } finally { setSaving(false); }
  }, [planId]);

  const debouncedSave = useCallback((planData) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => savePlan(planData), 800);
  }, [savePlan]);

  const recalcAndUpdate = (newPlan) => {
    let t = 0;
    for (const m of newPlan.months || []) { recalculateMonthCosts(m); t += m.monthly_total_cost || 0; }
    newPlan.total_program_cost = Math.round(t * 100) / 100;
    setPlan({ ...newPlan }); debouncedSave(newPlan);
  };

  const makeEntry = (supp) => ({
    supplement_id: supp._id, supplement_name: supp.supplement_name, company: supp.company || '',
    quantity_per_dose: supp.default_quantity_per_dose || null, frequency_per_day: supp.default_frequency_per_day || null,
    dosage_display: supp.default_dosage_display || '', instructions: supp.default_instructions || '',
    with_food: supp.default_instructions?.toLowerCase().includes('food') || false, hc_notes: '',
    units_per_bottle: supp.units_per_bottle || null, cost_per_bottle: supp.cost_per_bottle || 0,
    refrigerate: supp.refrigerate || false, bottles_needed: null, calculated_cost: null,
    bottles_per_month_override: supp.bottles_per_month || null,
  });

  const addSupplementToMonth = (monthNum, supp) => {
    if (!plan || isFinalized) return;
    const np = { ...plan }; const m = np.months?.find(x => x.month_number === monthNum);
    if (!m) return; m.supplements = [...(m.supplements || []), makeEntry(supp)];
    recalcAndUpdate(np); toast.success(`Added ${supp.supplement_name} to Month ${monthNum}`);
  };
  const addSupplementToAllMonths = (supp) => {
    if (!plan || isFinalized) return;
    const np = { ...plan }; const e = makeEntry(supp);
    for (const m of np.months || []) { m.supplements = [...(m.supplements || []), { ...e }]; }
    recalcAndUpdate(np); toast.success(`Added ${supp.supplement_name} to all months`);
  };
  const removeRow = (monthNum, index) => {
    if (!plan || isFinalized) return;
    const np = { ...plan }; const m = np.months?.find(x => x.month_number === monthNum);
    if (m) { m.supplements = (m.supplements || []).filter((_, i) => i !== index); }
    recalcAndUpdate(np); toast.success('Supplement removed');
  };
  const updateField = (monthNum, suppIndex, field, value) => {
    if (!plan || isFinalized) return;
    const np = { ...plan }; const m = np.months?.find(x => x.month_number === monthNum);
    if (m && m.supplements[suppIndex]) { m.supplements[suppIndex][field] = value; }
    recalcAndUpdate(np);
  };
  const updatePatientName = (name) => {
    if (!plan || isFinalized) return;
    const np = { ...plan, patient_name: name }; setPlan(np); debouncedSave(np);
  };

  const handleExportPatient = async () => { setExporting(true); try { if (!isFinalized) await savePlan(plan); const b = await exportPatientPDF(planId); downloadBlob(b, `${plan.patient_name || 'patient'}_protocol.pdf`); toast.success('Patient PDF exported'); } catch { toast.error('Export failed'); } finally { setExporting(false); } };
  const handleExportHC = async () => { setExporting(true); try { if (!isFinalized) await savePlan(plan); const b = await exportHCPDF(planId); downloadBlob(b, `${plan.patient_name || 'patient'}_protocol_HC.pdf`); toast.success('HC PDF exported'); } catch { toast.error('Export failed'); } finally { setExporting(false); } };
  const handleFinalize = async () => { try { await savePlan(plan); const r = await finalizePlan(planId); setPlan(prev => ({ ...prev, ...r })); toast.success('Plan finalized'); setConfirmFinalize(false); } catch { toast.error('Failed to finalize'); } };
  const handleReopen = async () => { try { const r = await reopenPlan(planId); setPlan(prev => ({ ...prev, ...r })); toast.success('Plan reopened'); } catch { toast.error('Failed to reopen'); } };
  const handleDuplicate = async () => { try { const r = await duplicatePlan(planId); toast.success('Plan duplicated'); navigate(`/plans/${r._id}`); } catch { toast.error('Failed to duplicate'); } };

  const addMonth = () => {
    if (!plan || isFinalized) return;
    const np = { ...plan }; const last = np.months?.[np.months.length - 1];
    const num = (last?.month_number || 0) + 1;
    np.months = [...(np.months || []), { month_number: num, supplements: (last?.supplements || []).map(s => ({ ...s })), monthly_total_cost: 0 }];
    recalcAndUpdate(np);
  };
  const removeMonth = (monthNum) => {
    if (!plan || isFinalized || (plan.months?.length || 0) <= 1) return;
    const np = { ...plan }; np.months = (np.months || []).filter(m => m.month_number !== monthNum);
    recalcAndUpdate(np);
  };

  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const globalFiltered = supplements.filter(s =>
    s.supplement_name.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
    s.company?.toLowerCase().includes(globalSearchQuery.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-[#0D5F68] border-t-transparent rounded-full animate-spin" /></div>;
  if (!plan) return null;

  return (
    <div className="p-10 max-w-[1560px] mx-auto">

      {/* ── Header card ── */}
      <div className="rounded-2xl border border-border/40 bg-[#FAFAFA] shadow-sm mb-8 overflow-hidden">
        {/* Top row: back + actions */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-[#C8E6E0] bg-[#EAF4F3]">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-2 text-muted-foreground hover:text-[#0B0D10] h-10 px-3 rounded-lg">
            <ArrowLeft size={18} /> Back
          </Button>
          <div className="flex items-center gap-2">
            {!patientViewMode && (
              <>
                <Button variant="outline" size="sm" onClick={() => setPatientViewMode(true)} className="gap-2 h-9 px-4 text-xs font-semibold" data-testid="plan-editor-patient-view-toggle"><User size={14} /> Patient View</Button>
                <Button variant="outline" size="sm" onClick={() => setShowCosts(!showCosts)} className="gap-2 h-9 px-4 text-xs font-semibold" data-testid="plan-editor-toggle-costs">
                  {showCosts ? <EyeOff size={14} /> : <Eye size={14} />} {showCosts ? 'Hide Costs' : 'Show Costs'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPatient} disabled={exporting} className="gap-2 h-9 px-4 text-xs font-semibold" data-testid="plan-editor-export-patient-pdf"><Download size={14} /> Patient PDF</Button>
                <Button variant="outline" size="sm" onClick={handleExportHC} disabled={exporting} className="gap-2 h-9 px-4 text-xs font-semibold" data-testid="plan-editor-export-hc-pdf"><FileText size={14} /> HC PDF</Button>
                {!isFinalized && (<>
                  <Button variant="outline" size="sm" onClick={handleDuplicate} className="gap-2 h-9 px-4 text-xs font-semibold"><Copy size={14} /> Duplicate</Button>
                  <Button size="sm" onClick={() => setConfirmFinalize(true)} className="gap-2 h-9 px-4 text-xs font-bold bg-[#B26A00] hover:bg-[#9A5B00] text-white" data-testid="plan-editor-finalize-button"><Lock size={14} /> Finalize</Button>
                  <Button size="sm" onClick={() => savePlan(plan)} disabled={saving} className="gap-2 h-9 px-5 text-xs font-bold bg-[#0D5F68] hover:bg-[#0A4E55] text-white" data-testid="plan-editor-save-button"><Save size={14} /> {saving ? 'Saving...' : 'Save'}</Button>
                </>)}
              </>
            )}
            {patientViewMode && (
              <>
                <Button variant="outline" size="sm" onClick={handleExportPatient} disabled={exporting} className="gap-2 h-9 px-4 text-xs font-semibold" data-testid="plan-editor-export-patient-pdf"><Download size={14} /> Patient PDF</Button>
                <Button size="sm" onClick={() => setPatientViewMode(false)} className="gap-2 h-9 px-4 text-xs font-bold bg-[#0D5F68] hover:bg-[#0A4E55] text-white">Exit Patient View</Button>
              </>
            )}
          </div>
        </div>

        {/* Patient name — large, centered */}
        <div className="px-8 py-14 text-center">
          <Input
            value={plan.patient_name || ''}
            onChange={(e) => updatePatientName(e.target.value)}
            className="text-5xl font-bold border-none bg-transparent h-20 focus-visible:ring-0 focus-visible:ring-offset-0 tracking-[-0.03em] text-center max-w-[480px] mx-auto"
            placeholder="Patient Name"
            data-testid="plan-editor-patient-name"
            disabled={isFinalized}
          />
          <div className="flex items-center justify-center gap-3 mt-3">
            <Badge className={`px-4 py-1.5 text-xs font-bold ${isFinalized ? 'bg-[#147D5A] text-white hover:bg-[#147D5A]' : 'bg-[#EEF1F1] text-[#61746E] hover:bg-[#EEF1F1]'}`}>
              {plan.status || 'draft'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {plan.program_name} / {plan.step_label || `Step ${plan.step_number}`} / {plan.date}
              {plan.created_by_name ? ` / ${plan.created_by_name}` : ''}
            </span>
            {saving && <span className="text-xs text-[#0D5F68] animate-pulse font-semibold">Saving...</span>}
          </div>
        </div>
      </div>

      {/* Finalized / Patient View banners */}
      {isFinalized && (
        <div className="mb-8 rounded-2xl bg-amber-50 border border-amber-200 p-5 flex items-center gap-4">
          <Lock size={18} className="text-amber-600 shrink-0" />
          <div>
            <span className="text-sm text-amber-800 font-bold">This plan is finalized and locked.</span>
            <p className="text-xs text-amber-600 mt-0.5">Reopen to make changes.</p>
          </div>
          <div className="ml-auto flex gap-3">
            <Button size="sm" onClick={handleReopen} className="gap-2 h-10 px-5 text-sm font-semibold bg-[#B26A00] hover:bg-[#9A5B00] text-white"><Unlock size={15} /> Reopen</Button>
            <Button variant="outline" size="sm" onClick={handleDuplicate} className="gap-2 h-10 px-5 text-sm font-semibold"><Copy size={15} /> Duplicate</Button>
          </div>
        </div>
      )}
      {patientViewMode && (
        <div className="mb-8 rounded-2xl bg-[#EAF4F3] border border-[#C8E6E0] p-5 flex items-center gap-4">
          <User size={18} className="text-[#0D5F68] shrink-0" />
          <span className="text-sm text-[#0D5F68] font-bold">Patient View — Costs and internal data are hidden.</span>
        </div>
      )}

      <div className="flex gap-8">
        <div className="flex-1 min-w-0">
          {/* Quick actions */}
          {!isFinalized && !patientViewMode && (
            <div className="flex items-center gap-3 mb-8">
              <Popover open={globalSearchOpen} onOpenChange={setGlobalSearchOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" className="gap-2 h-10 px-5 text-sm font-semibold bg-[#0D5F68] hover:bg-[#0A4E55] text-white shadow-sm"
                    data-testid="plan-editor-add-all-months">
                    <CopyPlus size={15} /> Add to all months
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[460px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search supplements..." value={globalSearchQuery} onValueChange={setGlobalSearchQuery} />
                    <CommandList><CommandEmpty>No supplements found.</CommandEmpty>
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
              <Button variant="outline" size="sm" onClick={addMonth} className="gap-2 h-10 px-5 text-sm font-semibold" data-testid="plan-editor-add-month">
                <Plus size={15} /> Add Month
              </Button>
              {(plan.months?.length || 0) > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removeMonth(plan.months[plan.months.length - 1].month_number)}
                  className="gap-2 h-10 px-5 text-sm font-medium text-[#C53B3B] hover:text-[#A52E2E] hover:bg-red-50">
                  <Trash2 size={15} /> Remove Last Month
                </Button>
              )}
            </div>
          )}

          {(plan.months || []).map((month) => (
            <MonthPage key={month.month_number} month={month}
              showCosts={effectiveShowCosts} patientView={patientViewMode} isFinalized={isFinalized}
              onUpdateField={updateField} onRemoveRow={removeRow} onAddSupplement={addSupplementToMonth}
              supplements={supplements} formatCurrency={formatCurrency} />
          ))}
        </div>

        {/* Cost Summary */}
        {effectiveShowCosts && !patientViewMode && (
          <div className="w-[340px] shrink-0">
            <div className="sticky top-10">
              <div className="rounded-2xl border border-border/40 bg-[#FAFAFA] shadow-sm p-7" data-testid="plan-editor-cost-summary">
                <h3 className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-6">Cost Summary</h3>
                <div className="space-y-4">
                  {(plan.months || []).map(month => (
                    <div key={month.month_number} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground font-medium">Month {month.month_number}</span>
                      <span className="font-mono tabular-nums text-sm font-bold">{formatCurrency(month.monthly_total_cost)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-bold text-[#0B0D10]">Program Total</span>
                    <span className="font-mono tabular-nums text-2xl font-bold text-[#147D5A]" data-testid="cost-summary-total-value">
                      {formatCurrency(plan.total_program_cost || 0)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-6 p-5 rounded-2xl bg-[#EAF4F3] border border-[#C8E6E0]">
                <p className="text-xs text-[#0D5F68] font-semibold">Cost visible to HC only. Patient PDFs exclude all cost info.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={confirmFinalize} onOpenChange={setConfirmFinalize}>
        <AlertDialogContent className="p-7">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Finalize this plan?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm mt-2">Finalizing locks the plan. You can reopen later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel className="h-10 px-5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalize} className="bg-[#B26A00] hover:bg-[#9A5B00] text-white h-10 px-5 font-semibold">Finalize Plan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
