import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPlan, updatePlan, getSupplements, exportPatientPDF, exportHCPDF, finalizePlan, reopenPlan, duplicatePlan, saveToDrive, getSuppliers } from '../lib/api';
import { formatCurrency, recalculateMonthCosts, downloadBlob } from '../lib/utils';
import { parseDosage, buildDosageText } from '../lib/dosageParser';
import { useAuth } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '../components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  ArrowLeft, Plus, Minus, Trash2, Download, FileText, Eye, EyeOff, Save,
  Snowflake, ChevronsUpDown, Lock, Unlock, Copy, User, CopyPlus, Calendar,
  MoreHorizontal,
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
    <div className="rounded-xl border border-[#E2E8F0] bg-white card-elevated mb-8 overflow-hidden"
      data-testid={`month-page-${month.month_number}`}>

      {/* Month header */}
      <div className="flex items-center justify-between px-8 py-4 bg-[#0D5F68] rounded-t-xl">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shadow-sm">
            <Calendar size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{month.month_number === 0.5 ? '2 Weeks' : `Month ${month.month_number}`}</h3>
            <p className="text-xs text-white/60 mt-0.5">
              {(month.supplements || []).length} supplement{(month.supplements || []).length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {showCosts && !patientView && (
          <div className="flex items-center gap-3 bg-white/15 px-5 py-2.5 rounded-xl">
            <span className="text-xs text-white/70 font-semibold uppercase tracking-wider">Monthly Total</span>
            <span className="font-mono tabular-nums text-lg font-bold text-white">
              {formatCurrency(month.monthly_total_cost)}
            </span>
          </div>
        )}
      </div>

      {/* Column headers */}
      <div className="grid items-center px-6 py-4 border-b border-border/30 bg-[#FAFAFA] gap-x-3"
        style={{
          gridTemplateColumns: patientView
            ? '90px 1fr 120px 60px 1fr'
            : showCosts
              ? '90px 1fr 80px 80px 120px 60px 1fr 50px 80px 32px'
              : '90px 1fr 80px 80px 140px 60px 1fr 32px'
        }}>
        <span className="text-[11px] font-semibold tracking-[0.05em] uppercase text-[#4A5568] text-center">Times</span>
        <span className="text-[11px] font-semibold tracking-[0.05em] uppercase text-[#4A5568]">Supplement</span>
        {!patientView && (<>
          <span className="text-[11px] font-semibold tracking-[0.05em] uppercase text-[#4A5568] text-center">Qty</span>
          <span className="text-[11px] font-semibold tracking-[0.05em] uppercase text-[#4A5568] text-center">x/Day</span>
        </>)}
        <span className="text-[11px] font-semibold tracking-[0.05em] uppercase text-[#4A5568] text-center">Dosage</span>
        <span className="text-[11px] font-semibold tracking-[0.05em] uppercase text-[#4A5568] text-center">Food</span>
        <span className="text-[11px] font-semibold tracking-[0.05em] uppercase text-[#4A5568]">Notes</span>
        {showCosts && !patientView && (<>
          <span className="text-[11px] font-semibold tracking-[0.05em] uppercase text-[#4A5568] text-center">Btls</span>
          <span className="text-[11px] font-semibold tracking-[0.05em] uppercase text-[#4A5568] text-right">Cost</span>
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
              className="grid items-center px-6 py-4 border-b border-border/15 last:border-b-0 hover:bg-[#F0FAFA] transition-colors duration-150 group gap-x-3"
              style={{
                gridTemplateColumns: patientView
                  ? '90px 1fr 120px 60px 1fr'
                  : showCosts
                    ? '90px 1fr 80px 80px 120px 60px 1fr 50px 80px 32px'
                    : '90px 1fr 80px 80px 140px 60px 1fr 32px'
              }}>
              {/* Time slots — 3 toggle chips */}
              <div className="flex justify-center gap-1">
                {patientView ? (
                  <span className="text-xs font-semibold text-[#0D5F68]">{(supp.times || ['AM']).join(', ')}</span>
                ) : (
                  ['AM', 'Aft', 'PM'].map((label, ti) => {
                    const fullName = ['AM', 'Afternoon', 'PM'][ti];
                    const times = supp.times || ['AM'];
                    const active = times.includes(fullName);
                    return (
                      <button key={label} type="button" disabled={isFinalized}
                        onClick={() => {
                          const newTimes = active
                            ? times.filter(t => t !== fullName)
                            : [...times, fullName].sort((a, b) => ['AM','Afternoon','PM'].indexOf(a) - ['AM','Afternoon','PM'].indexOf(b));
                          if (newTimes.length === 0) return; // Must have at least one
                          onUpdateField(month.month_number, idx, 'times', newTimes);
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                          active
                            ? 'bg-[#0D5F68] text-white'
                            : 'bg-[#EAF4F3] text-[#94A3B8] hover:text-[#0D5F68]'
                        } ${isFinalized ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {label}
                      </button>
                    );
                  })
                )}
              </div>
              {/* Supplement */}
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-sm font-semibold text-[#0B0D10]">{supp.supplement_name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{supp.company}</div>
                </div>
                {supp.refrigerate && <Snowflake size={13} className="text-blue-500 shrink-0" />}
              </div>
              {!patientView && (<>
                <div className="flex justify-center"><NumberStepper value={supp.quantity_per_dose} disabled={isFinalized}
                  onChange={(v) => onUpdateField(month.month_number, idx, 'quantity_per_dose', v)} /></div>
                <div className="flex justify-center"><NumberStepper value={supp.frequency_per_day} disabled={isFinalized}
                  onChange={(v) => onUpdateField(month.month_number, idx, 'frequency_per_day', v)} /></div>
              </>)}
              {/* Dosage */}
              <div className="flex justify-center">
                {patientView ? <span className="text-sm text-center">{supp.dosage_display || '-'}</span> :
                  <Input value={supp.dosage_display || ''}
                    onChange={(e) => onUpdateField(month.month_number, idx, 'dosage_display', e.target.value)}
                    className="h-9 text-xs text-center w-full border-[#C8E6E0] rounded-lg" placeholder="2 caps 3x/day" disabled={isFinalized} />}
              </div>
              {/* With Food */}
              <div className="flex justify-center">
                {patientView ? (
                  <span className="text-xs">{supp.with_food ? 'Yes' : 'No'}</span>
                ) : (
                  <Select value={supp.with_food ? 'yes' : 'no'} onValueChange={(v) => onUpdateField(month.month_number, idx, 'with_food', v === 'yes')} disabled={isFinalized}>
                    <SelectTrigger className="h-9 text-xs border-[#C8E6E0] w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              {/* Notes/Instructions */}
              <div>
                {patientView ? <span className="text-sm text-muted-foreground italic">{supp.instructions || '-'}</span> :
                  <Input value={supp.instructions || ''}
                    onChange={(e) => onUpdateField(month.month_number, idx, 'instructions', e.target.value)}
                    className="h-9 text-xs w-full border-[#C8E6E0] rounded-lg" placeholder="Notes..." disabled={isFinalized} />}
              </div>
              {showCosts && !patientView && (<>
                <div className="font-mono tabular-nums text-xs font-semibold text-[#2B3437] text-center">{supp.bottles_needed || '-'}</div>
                <div className="font-mono tabular-nums text-sm font-bold text-[#147D5A] text-right whitespace-nowrap">{formatCurrency(supp.calculated_cost)}</div>
              </>)}
              {!isFinalized && !patientView && (
                <div className="flex justify-center">
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
  const [supplierFreight, setCompanyFreight] = useState({});
  const [exporting, setExporting] = useState(false);
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const saveTimerRef = useRef(null);
  const isFinalized = plan?.status === 'finalized';
  const effectiveShowCosts = patientViewMode ? false : showCosts;

  useEffect(() => {
    const load = async () => {
      try {
        const [p, s, c] = await Promise.all([getPlan(planId), getSupplements('', true), getSuppliers()]);
        setPlan(p); setSupplements(s.supplements || []);
        const freightMap = {};
        for (const co of (c.suppliers || [])) { if (co.freight_charge > 0) freightMap[co.name] = co.freight_charge; }
        setCompanyFreight(freightMap);
      } catch (err) { toast.error('Failed to load plan'); navigate(-1); }
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
    for (const m of newPlan.months || []) { recalculateMonthCosts(m, supplierFreight); t += m.monthly_total_cost || 0; }
    newPlan.total_program_cost = Math.round(t * 100) / 100;
    setPlan({ ...newPlan }); debouncedSave(newPlan);
  };

  // Map frequency to default time slots
  const freqToTimes = (freq) => {
    if (freq >= 3) return ['AM', 'Afternoon', 'PM'];
    if (freq === 2) return ['AM', 'PM'];
    return ['AM'];
  };

  const makeEntry = (supp) => {
    const freq = supp.default_frequency_per_day || 1;
    return {
      supplement_id: supp._id, supplement_name: supp.supplement_name, company: supp.company || '',
      quantity_per_dose: supp.default_quantity_per_dose || null, frequency_per_day: freq,
      dosage_display: supp.default_dosage_display || '', instructions: supp.default_instructions || '',
      with_food: supp.default_instructions?.toLowerCase().includes('food') || true,
      times: freqToTimes(freq), hc_notes: '',
      units_per_bottle: supp.units_per_bottle || null, cost_per_bottle: supp.cost_per_bottle || 0,
      refrigerate: supp.refrigerate || false, bottles_needed: null, calculated_cost: null,
      bottles_per_month_override: supp.bottles_per_month || null,
    };
  };

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
    if (m && m.supplements[suppIndex]) {
      const s = m.supplements[suppIndex];
      s[field] = value;
      
      // Find unit type from master supplement list
      const master = supplements.find(ms => ms._id === s.supplement_id);
      const unit = master?.unit_type || 'caps';
      
      if (field === 'quantity_per_dose' || field === 'frequency_per_day') {
        // Steppers changed → rebuild dosage text + update times
        const qty = field === 'quantity_per_dose' ? value : s.quantity_per_dose;
        const freq = field === 'frequency_per_day' ? value : s.frequency_per_day;
        if (qty && freq) {
          s.dosage_display = buildDosageText(qty, freq, unit);
        }
        if (field === 'frequency_per_day' && value) {
          s.times = freqToTimes(value);
        }
      } else if (field === 'dosage_display') {
        // Dosage text changed → try to parse into qty + freq + times
        const parsed = parseDosage(value);
        if (parsed) {
          s.quantity_per_dose = parsed.qty;
          s.frequency_per_day = parsed.freq;
          s.times = freqToTimes(parsed.freq);
        }
      } else if (field === 'times') {
        // Time chips toggled → update frequency + dosage text
        s.frequency_per_day = value.length;
        if (s.quantity_per_dose) {
          s.dosage_display = buildDosageText(s.quantity_per_dose, value.length, unit);
        }
      }
    }
    recalcAndUpdate(np);
  };
  const updatePatientName = (name) => {
    if (!plan || isFinalized || plan.patient_id) return;
    const np = { ...plan, patient_name: name }; setPlan(np); debouncedSave(np);
  };

  const goBack = () => {
    if (plan?.patient_id) {
      navigate(`/patients/${plan.patient_id}`);
    } else if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleExportPatient = async () => { setExporting(true); try { if (!isFinalized) await savePlan(plan); const b = await exportPatientPDF(planId); downloadBlob(b, `${plan.patient_name || 'patient'}_protocol.pdf`); toast.success('Patient PDF exported'); } catch { toast.error('Export failed'); } finally { setExporting(false); } };
  const handleExportHC = async () => { setExporting(true); try { if (!isFinalized) await savePlan(plan); const b = await exportHCPDF(planId); downloadBlob(b, `${plan.patient_name || 'patient'}_protocol_HC.pdf`); toast.success('HC PDF exported'); } catch { toast.error('Export failed'); } finally { setExporting(false); } };
  const [savingDrive, setSavingDrive] = useState(false);
  const handleSaveToDrive = async () => {
    setSavingDrive(true);
    try {
      if (!isFinalized) await savePlan(plan);
      const result = await saveToDrive(planId);
      toast.success(result.message || 'Saved to Google Drive');
    } catch (err) { toast.error(err.message || 'Drive save failed'); }
    finally { setSavingDrive(false); }
  };
  const handleFinalize = async () => { try { await savePlan(plan); const r = await finalizePlan(planId); setPlan(prev => ({ ...prev, ...r })); toast.success('Plan finalized'); setConfirmFinalize(false); } catch { toast.error('Failed to finalize'); } };
  const handleReopen = async () => { try { const r = await reopenPlan(planId); setPlan(prev => ({ ...prev, ...r })); toast.success('Plan reopened'); } catch { toast.error('Failed to reopen'); } };

  // Duplicate dialog
  const [dupOpen, setDupOpen] = useState(false);
  const [dupTarget, setDupTarget] = useState('same');
  const [dupPatients, setDupPatients] = useState([]);
  const [dupSelectedPatientId, setDupSelectedPatientId] = useState('');
  const [dupNewName, setDupNewName] = useState('');
  const [dupLoading, setDupLoading] = useState(false);

  const openDuplicateDialog = () => {
    setDupTarget('same'); setDupNewName(''); setDupSelectedPatientId(''); setDupOpen(true);
    import('../lib/api').then(api => api.getPatients('')).then(res => setDupPatients(res.patients || [])).catch(() => {});
  };
  const handleDuplicate = async () => {
    setDupLoading(true);
    try {
      const body = { target: dupTarget };
      if (dupTarget === 'existing') body.patient_id = dupSelectedPatientId;
      if (dupTarget === 'new') body.new_patient_name = dupNewName;
      const r = await duplicatePlan(planId, body);
      toast.success('Plan duplicated'); setDupOpen(false); navigate(`/plans/${r._id}`);
    } catch (err) { toast.error(err.message || 'Failed to duplicate'); }
    finally { setDupLoading(false); }
  };

  const addMonth = () => {
    if (!plan || isFinalized) return;
    const np = { ...plan }; const last = np.months?.[np.months.length - 1];
    const num = Math.ceil(last?.month_number || 0) + 1;
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

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#94A3B8] mb-4">
        <button onClick={() => navigate('/')} className="hover:text-[#334155] transition-colors">Dashboard</button>
        <span>/</span>
        {plan?.patient_id && (
          <>
            <button onClick={() => navigate(`/patients/${plan.patient_id}`)} className="hover:text-[#334155] transition-colors">{plan.patient_name}</button>
            <span>/</span>
          </>
        )}
        <span className="text-[#334155] font-medium">{plan?.program_name} - {plan?.step_label}</span>
      </div>

      {/* ── Top bar: name + meta ── */}
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="sm" onClick={goBack} className="text-[#94A3B8] hover:text-[#0B0D10] h-9 w-9 p-0 rounded-lg shrink-0">
          <ArrowLeft size={18} />
        </Button>
        {plan.patient_id ? (
          <button onClick={() => navigate(`/patients/${plan.patient_id}`)}
            className="text-xl font-bold text-[#0B0D10] tracking-[-0.02em] hover:text-[#0D5F68] transition-colors" data-testid="plan-editor-patient-name">
            {plan.patient_name}
          </button>
        ) : (
          <Input value={plan.patient_name || ''} onChange={(e) => updatePatientName(e.target.value)}
            className="text-xl font-bold border border-[#C8E6E0] bg-white rounded-lg h-9 focus-visible:ring-0 focus-visible:ring-offset-0 tracking-[-0.02em] max-w-[260px]"
            placeholder="Patient Name" data-testid="plan-editor-patient-name" disabled={isFinalized} />
        )}
        <span className="text-sm text-[#718096]">
          {plan.program_name} / {plan.step_label || `Step ${plan.step_number}`} / {plan.date}
          {plan.created_by_name ? ` / ${plan.created_by_name}` : ''}
        </span>
        <Badge className={`px-2.5 py-1 text-[10px] font-bold rounded-md ${isFinalized ? 'bg-[#0D5F68] text-white hover:bg-[#0D5F68]' : 'bg-[#FEF3C7] text-[#92400E] hover:bg-[#FEF3C7]'}`}>
          {plan.status || 'draft'}
        </Badge>
        {saving && <span className="text-xs text-[#0D5F68] animate-pulse font-semibold">Saving...</span>}
      </div>

      {/* Banners */}
      {isFinalized && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center gap-3">
          <Lock size={16} className="text-amber-600 shrink-0" />
          <span className="text-sm text-amber-800 font-semibold">This plan is finalized.</span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" onClick={handleReopen} className="gap-2 h-9 px-4 text-xs font-semibold bg-[#B26A00] hover:bg-[#9A5B00] text-white"><Unlock size={14} /> Reopen</Button>
            <Button variant="outline" size="sm" onClick={openDuplicateDialog} className="gap-2 h-9 px-4 text-xs font-semibold"><Copy size={14} /> Duplicate</Button>
          </div>
        </div>
      )}
      {patientViewMode && (
        <div className="mb-4 rounded-xl bg-[#EAF4F3] border border-[#C8E6E0] p-4 flex items-center gap-3">
          <User size={16} className="text-[#0D5F68] shrink-0" />
          <span className="text-sm text-[#0D5F68] font-semibold">Patient View — Costs hidden.</span>
          <Button size="sm" onClick={() => setPatientViewMode(false)} className="ml-auto gap-2 h-9 px-4 text-xs font-semibold bg-[#0D5F68] hover:bg-[#0A4E55] text-white">Exit</Button>
        </div>
      )}

      <div className="flex gap-8">
        <div className="flex-1 min-w-0">
          {/* Action row: add buttons left, Actions dropdown right */}
          <div className="flex items-center gap-3 mb-6">
            {!isFinalized && !patientViewMode && (
              <>
                <Popover open={globalSearchOpen} onOpenChange={setGlobalSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button size="sm" className="gap-2 h-9 px-4 text-xs font-semibold bg-[#0D5F68] hover:bg-[#0A4E55] text-white shadow-sm"
                      data-testid="plan-editor-add-all-months">
                      <CopyPlus size={14} /> Add to all months
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
              <Button variant="outline" size="sm" onClick={addMonth} className="gap-2 h-9 px-4 text-xs font-semibold" data-testid="plan-editor-add-month">
                <Plus size={14} /> Add Month
              </Button>
              {(plan.months?.length || 0) > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removeMonth(plan.months[plan.months.length - 1].month_number)}
                  className="gap-2 h-9 px-4 text-xs font-medium text-[#C53B3B] hover:text-[#A52E2E] hover:bg-red-50">
                  <Trash2 size={14} /> Remove Last
                </Button>
              )}
              </>
            )}

            {/* Actions area — far right */}
            <div className="ml-auto flex items-center gap-2">
              {!patientViewMode && (
                <Button variant="outline" size="sm" onClick={() => setShowCosts(!showCosts)}
                  className="gap-2 h-9 px-4 text-xs font-semibold" data-testid="plan-editor-toggle-costs">
                  {showCosts ? <EyeOff size={14} /> : <Eye size={14} />} {showCosts ? 'Hide Costs' : 'Show Costs'}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 h-9 px-4 text-xs font-semibold">
                    <MoreHorizontal size={14} /> Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {!patientViewMode && (
                    <>
                      <DropdownMenuItem onClick={() => setPatientViewMode(true)} data-testid="plan-editor-patient-view-toggle">
                        <User size={14} className="mr-2" /> Patient View
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={handleExportPatient} disabled={exporting} data-testid="plan-editor-export-patient-pdf">
                    <Download size={14} className="mr-2" /> Export Patient PDF
                  </DropdownMenuItem>
                  {!patientViewMode && (
                    <DropdownMenuItem onClick={handleExportHC} disabled={exporting} data-testid="plan-editor-export-hc-pdf">
                      <FileText size={14} className="mr-2" /> Export HC PDF
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleSaveToDrive} disabled={savingDrive} data-testid="plan-editor-save-drive">
                    <svg width="14" height="14" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg" className="mr-2 shrink-0"><path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA"/><path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z" fill="#00AC47"/><path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 9.65z" fill="#EA4335"/><path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832D"/><path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h22.9c1.6 0 3.15-.45 4.5-1.2z" fill="#2684FC"/><path d="M73.4 26.5 60.65 3.3c-.8-1.4-1.95-2.5-3.3-3.3L43.6 25l16.15 28h27.5c0-1.55-.4-3.1-1.2-4.5z" fill="#FFBA00"/></svg>
                    Save to Google Drive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={openDuplicateDialog}>
                    <Copy size={14} className="mr-2" /> Duplicate Plan
                  </DropdownMenuItem>
                  {!isFinalized && !patientViewMode && (
                    <>
                      <DropdownMenuItem onClick={() => savePlan(plan)} disabled={saving} data-testid="plan-editor-save-button">
                        <Save size={14} className="mr-2" /> {saving ? 'Saving...' : 'Save Plan'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setConfirmFinalize(true)} className="text-[#B26A00]" data-testid="plan-editor-finalize-button">
                        <Lock size={14} className="mr-2" /> Finalize Plan
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

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
              <div className="rounded-xl border border-[#E2E8F0] bg-white card-elevated p-7" data-testid="plan-editor-cost-summary">
                <h3 className="text-[11px] font-semibold tracking-[0.05em] uppercase text-[#4A5568] mb-6">Cost Summary</h3>
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

      {/* Duplicate Dialog */}
      <Dialog open={dupOpen} onOpenChange={setDupOpen}>
        <DialogContent className="max-w-[440px] p-7">
          <DialogHeader>
            <DialogTitle className="text-lg">Duplicate Plan</DialogTitle>
            <DialogDescription className="text-sm mt-1">Choose where to place the duplicated plan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Assign to</Label>
              <Select value={dupTarget} onValueChange={setDupTarget}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="same">Same patient</SelectItem>
                  <SelectItem value="existing">Existing patient</SelectItem>
                  <SelectItem value="new">New patient</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dupTarget === 'existing' && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Select patient</Label>
                <Select value={dupSelectedPatientId} onValueChange={setDupSelectedPatientId}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Choose a patient..." /></SelectTrigger>
                  <SelectContent>
                    {dupPatients.map(p => (
                      <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {dupTarget === 'new' && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">New patient name</Label>
                <Input value={dupNewName} onChange={(e) => setDupNewName(e.target.value)}
                  className="h-11" placeholder="e.g. Jane Smith" autoFocus />
              </div>
            )}
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setDupOpen(false)} className="h-10 px-5">Cancel</Button>
            <Button onClick={handleDuplicate} disabled={dupLoading || (dupTarget === 'existing' && !dupSelectedPatientId) || (dupTarget === 'new' && !dupNewName.trim())}
              className="h-10 px-6 bg-[#0D5F68] hover:bg-[#0A4E55] text-white font-semibold">
              {dupLoading ? 'Duplicating...' : 'Duplicate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
