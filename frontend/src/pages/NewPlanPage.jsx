import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getTemplates, createPlan, createPatient } from '../lib/api';
import { useAuth } from '../App';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader, { PageContainer } from '../components/PageHeader';

const DEFAULT_PROGRAMS = ['Detox 1', 'Detox 2', 'Maintenance'];
const DEFAULT_STEPS = [1, 2, 3];

export default function NewPlanPage() {
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedStep, setSelectedStep] = useState('');
  const [monthCount, setMonthCount] = useState(1);
  const [searchParams] = useSearchParams();
  const prePatientId = searchParams.get('patient_id') || '';
  const prePatientName = searchParams.get('patient_name') || '';
  const [patientName, setPatientName] = useState(prePatientName);
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0]);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { user: appUser } = useAuth();

  useEffect(() => {
    if (!appUser) return;
    getTemplates().then(r => setTemplates(r.templates || [])).catch(() => {});
  }, [appUser]);

  const selectedTemplate = templates.find(
    t => t.program_name === selectedProgram && t.step_number === Number(selectedStep)
  );

  const programList = [...new Set([...DEFAULT_PROGRAMS, ...templates.map(t => t.program_name)])].sort();
  const stepList = [...new Set([...DEFAULT_STEPS, ...templates.filter(t => t.program_name === selectedProgram).map(t => t.step_number)])].sort((a, b) => a - b);

  useEffect(() => {
    if (selectedTemplate) setMonthCount(selectedTemplate.default_months || 1);
  }, [selectedTemplate]);

  const canProceed = () => {
    if (step === 1) return selectedProgram && selectedStep;
    if (step === 2) return monthCount >= 0.5;
    if (step === 3) return patientName.trim().length > 0;
    return true;
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      let patientId = prePatientId || null;
      if (!patientId && patientName.trim()) {
        const newPatient = await createPatient({ name: patientName.trim() });
        patientId = newPatient._id;
      }
      const buildSupp = (s) => ({
        supplement_id: s.supplement_id || '',
        supplement_name: s.supplement_name,
        company: s.company || '',
        supplier: s.supplier || '',
        manufacturer: s.manufacturer || s.company || '',
        unit_type: s.unit_type || 'caps',
        quantity_per_dose: s.quantity_per_dose || null,
        frequency_per_day: s.frequency_per_day || null,
        dosage_display: s.dosage_display || '',
        instructions: s.instructions || '',
        with_food: true,
        times: (s.frequency_per_day || 1) >= 3 ? ['AM', 'Afternoon', 'PM'] : (s.frequency_per_day || 1) === 2 ? ['AM', 'PM'] : ['AM'],
        hc_notes: '',
        units_per_bottle: s.units_per_bottle || null,
        cost_per_bottle: s.cost_per_bottle || 0,
        refrigerate: s.refrigerate || false,
        bottles_needed: null,
        calculated_cost: null,
      });
      const data = {
        patient_name: patientName.trim(),
        patient_id: patientId,
        date: planDate,
        program_name: selectedProgram,
        step_label: `Step ${selectedStep}`,
        step_number: Number(selectedStep),
        template_id: selectedTemplate?._id || null,
        months: (selectedTemplate?.months || []).length > 0
          ? selectedTemplate.months.map(m => ({
              month_number: m.month_number,
              supplements: (m.supplements || []).map(buildSupp),
              monthly_total_cost: 0,
            }))
          : Array.from({ length: Math.ceil(monthCount) }, (_, i) => ({
              month_number: monthCount === 0.5 ? 0.5 : i + 1,
              supplements: (selectedTemplate?.supplements || []).map(buildSupp),
              monthly_total_cost: 0,
            })),
      };
      const result = await createPlan(data);
      toast.success('Plan created');
      navigate(`/plans/${result._id}`);
    } catch (err) {
      const msg = typeof err === 'string' ? err : (err?.message || JSON.stringify(err?.detail || 'Failed to create plan'));
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const wizardSteps = [
    { num: 1, label: 'Program' },
    { num: 2, label: 'Duration' },
    { num: 3, label: 'Patient' },
    { num: 4, label: 'Review' },
  ];

  return (
    <PageContainer>
      <PageHeader title="New plan" subtitle="Set up a supplement protocol for your patient">
        <button
          onClick={() => navigate('/')}
          className="h-8 w-8 flex items-center justify-center rounded-md text-ink-subtle hover:text-ink hover:bg-[color:var(--surface-hover)]"
          aria-label="Back"
        >
          <ArrowLeft size={15} />
        </button>
      </PageHeader>

      <div className="max-w-[720px] mx-auto px-8 py-8">
        {/* Progress */}
        <div className="flex items-center gap-3 mb-8">
          {wizardSteps.map((ws, i) => (
            <React.Fragment key={ws.num}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors ${
                  step > ws.num
                    ? 'bg-[color:var(--accent-teal)] text-white'
                    : step === ws.num
                    ? 'bg-[color:var(--accent-teal-wash)] text-[color:var(--accent-teal)] ring-1 ring-[color:var(--accent-teal)]'
                    : 'bg-[color:var(--surface-hover)] text-ink-subtle border hairline'
                }`}>
                  {step > ws.num ? <Check size={12} strokeWidth={2.4} /> : ws.num}
                </div>
                <span className={`text-[12px] hidden sm:inline ${
                  step === ws.num ? 'font-semibold text-ink' : 'font-medium text-ink-muted'
                }`}>
                  {ws.label}
                </span>
              </div>
              {i < wizardSteps.length - 1 && (
                <div className={`flex-1 h-px ${step > ws.num ? 'bg-[color:var(--accent-teal)]' : 'bg-[color:var(--hairline)]'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-lg border hairline surface shadow-[var(--shadow-xs)] overflow-hidden">
          <div
            aria-hidden
            className="h-[2px] w-full"
            style={{ background: 'linear-gradient(90deg, #0D5F68 0%, #46989D 50%, #0D5F68 100%)' }}
          />
          <div className="p-7">
            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-ink-3">Program</Label>
                  <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                    <SelectTrigger className="h-10 text-[13px]" data-testid="wizard-program-select">
                      <SelectValue placeholder="Select a program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programList.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-ink-3">Step</Label>
                  <Select value={selectedStep} onValueChange={setSelectedStep}>
                    <SelectTrigger className="h-10 text-[13px]" data-testid="wizard-step-select">
                      <SelectValue placeholder="Select a step" />
                    </SelectTrigger>
                    <SelectContent>
                      {stepList.map(s => <SelectItem key={s} value={String(s)}>Step {s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {selectedTemplate && (
                  <div className="text-[12.5px] text-ink-muted p-3.5 bg-[color:var(--accent-teal-wash)] rounded-md border border-[color:var(--accent-teal)]/10">
                    Template has{' '}
                    <span className="font-semibold text-[color:var(--accent-teal)]">
                      {selectedTemplate.supplements?.length || 0}
                    </span>{' '}
                    default supplement{selectedTemplate.supplements?.length !== 1 ? 's' : ''} and{' '}
                    <span className="font-semibold text-[color:var(--accent-teal)]">
                      {selectedTemplate.default_months}
                    </span>{' '}
                    month{selectedTemplate.default_months !== 1 ? 's' : ''}.
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-ink-3">Duration</Label>
                  <Input
                    type="number" min={0.5} max={12} step={0.5}
                    value={monthCount}
                    onChange={(e) => setMonthCount(Math.max(0.5, parseFloat(e.target.value) || 1))}
                    data-testid="wizard-month-count-input"
                    className="h-10 w-32 font-mono text-[14px] tabular-nums"
                  />
                  <p className="text-[12px] text-ink-muted">In months. Use 0.5 for 2 weeks. Pre-filled from template.</p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-ink-3">Patient name</Label>
                  <Input
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Enter patient name"
                    data-testid="wizard-patient-name-input"
                    className="h-10 text-[13px]"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-ink-3">Date</Label>
                  <Input
                    type="date"
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                    data-testid="wizard-date-input"
                    className="h-10 w-52 text-[13px]"
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h3 className="text-[14px] font-semibold text-ink tracking-[-0.01em]">Review</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 rounded-md bg-[color:var(--surface-hover)] hairline border">
                  {[
                    ['Patient', patientName],
                    ['Date', planDate],
                    ['Program', selectedProgram],
                    ['Step', `Step ${selectedStep}`],
                    ['Months', monthCount],
                    ['Template supplements', selectedTemplate?.supplements?.length || 0],
                  ].map(([label, value]) => (
                    <div key={label} className="space-y-0.5">
                      <div className="text-[10px] uppercase tracking-[0.09em] font-semibold text-ink-subtle">
                        {label}
                      </div>
                      <div className="text-[13px] font-medium text-ink">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-5 hairline-t">
              <button
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-[13px] font-medium border hairline bg-white hover:bg-[color:var(--surface-hover)] text-ink-3 hover:text-ink disabled:opacity-40 disabled:pointer-events-none"
              >
                <ArrowLeft size={13} /> Back
              </button>
              {step < 4 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[13px] font-semibold bg-[color:var(--accent-teal)] text-white hover:bg-[color:var(--accent-teal-hover)] disabled:opacity-40 disabled:pointer-events-none shadow-[var(--shadow-xs)]"
                >
                  Next <ArrowRight size={13} />
                </button>
              ) : (
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  data-testid="wizard-create-plan-button"
                  className="inline-flex items-center gap-1.5 h-9 px-5 rounded-md text-[13px] font-semibold bg-[color:var(--accent-teal)] text-white hover:bg-[color:var(--accent-teal-hover)] disabled:opacity-60 shadow-[var(--shadow-xs)]"
                >
                  {creating ? 'Creating…' : 'Create plan'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
