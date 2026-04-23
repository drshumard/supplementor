import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getTemplates, createPlan, createPatient } from '../lib/api';
import { useAuth } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';

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
    if (!appUser) return; // Wait for auth
    getTemplates().then(r => {
      const t = r.templates || [];
      setTemplates(t);
    }).catch(() => {});
  }, [appUser]);

  const selectedTemplate = templates.find(
    t => t.program_name === selectedProgram && t.step_number === Number(selectedStep)
  );

  // Derive program and step lists from templates + defaults
  const programList = [...new Set([...DEFAULT_PROGRAMS, ...templates.map(t => t.program_name)])].sort();
  const stepList = [...new Set([...DEFAULT_STEPS, ...templates.filter(t => t.program_name === selectedProgram).map(t => t.step_number)])].sort((a, b) => a - b);

  useEffect(() => {
    if (selectedTemplate) {
      setMonthCount(selectedTemplate.default_months || 1);
    }
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
      // If no patient linked, create one first
      let patientId = prePatientId || null;
      if (!patientId && patientName.trim()) {
        const newPatient = await createPatient({ name: patientName.trim() });
        patientId = newPatient._id;
      }
      
      const data = {
        patient_name: patientName.trim(),
        patient_id: patientId,
        date: planDate,
        program_name: selectedProgram,
        step_label: `Step ${selectedStep}`,
        step_number: Number(selectedStep),
        template_id: selectedTemplate?._id || null,
        months: (() => {
          const templateMonths = selectedTemplate?.months || [];
          const templateSupps = templateMonths.length > 0
            ? templateMonths[0].supplements || []
            : selectedTemplate?.supplements || [];
          
          const mapSupp = (s) => ({
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
            times: s.times || ((s.frequency_per_day || 1) >= 3 ? ['AM', 'Afternoon', 'PM'] : (s.frequency_per_day || 1) === 2 ? ['AM', 'PM'] : ['AM']),
            hc_notes: '',
            units_per_bottle: s.units_per_bottle || null,
            cost_per_bottle: s.cost_per_bottle || 0,
            refrigerate: s.refrigerate || false,
            bottles_needed: null,
            calculated_cost: null,
          });

          // If user's monthCount matches template months, use template month-by-month data
          if (templateMonths.length > 0 && templateMonths.length === Math.ceil(monthCount)) {
            return templateMonths.map((m, i) => ({
              month_number: monthCount === 0.5 && i === 0 ? 0.5 : m.month_number,
              supplements: (m.supplements || []).map(mapSupp),
              monthly_total_cost: 0,
            }));
          }

          // Otherwise create the requested number of months using template's supplement list
          const numMonths = Math.max(1, Math.ceil(monthCount));
          return Array.from({ length: numMonths }, (_, i) => ({
            month_number: monthCount === 0.5 && i === 0 ? 0.5 : i + 1,
            supplements: templateSupps.map(mapSupp),
            monthly_total_cost: 0,
          }));
        })(),
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
    <div className="p-10 max-w-[760px] mx-auto">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/')}
        className="mb-8 gap-2 text-muted-foreground hover:text-[#0B0D10] h-10 px-4"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </Button>

      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#0B0D10] mb-2">
        Create New Plan
      </h1>
      <p className="text-sm text-muted-foreground mb-10">
        Set up a supplement protocol for your patient
      </p>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-10">
        {wizardSteps.map((ws, i) => (
          <React.Fragment key={ws.num}>
            <div className={`flex items-center gap-2.5 ${
              step >= ws.num ? 'text-[#0D5F68]' : 'text-[#94A3B8]'
            }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step > ws.num
                  ? 'bg-[#0D5F68] text-white shadow-md'
                  : step === ws.num
                  ? 'bg-[#EAF4F3] text-[#0D5F68] ring-2 ring-[#0D5F68] shadow-sm'
                  : 'bg-[#F1F5F9] text-[#94A3B8]'
              }`}>
                {step > ws.num ? <Check size={16} /> : ws.num}
              </div>
              <span className={`text-sm hidden sm:inline ${step === ws.num ? 'font-bold' : 'font-medium'}`}>{ws.label}</span>
            </div>
            {i < wizardSteps.length - 1 && (
              <div className={`flex-1 h-[3px] rounded-full ${
                step > ws.num ? 'bg-[#0D5F68]' : 'bg-[#E2E8F0]'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      <Card className="shadow-[var(--shadow-sm)] border-border/50">
        <CardContent className="p-8">
          {step === 1 && (
            <div className="space-y-7">
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold">Program</Label>
                <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                  <SelectTrigger className="h-12 text-base" data-testid="wizard-program-select">
                    <SelectValue placeholder="Select a program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programList.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold">Step</Label>
                <Select value={selectedStep} onValueChange={setSelectedStep}>
                  <SelectTrigger className="h-12 text-base" data-testid="wizard-step-select">
                    <SelectValue placeholder="Select a step" />
                  </SelectTrigger>
                  <SelectContent>
                    {stepList.map(s => <SelectItem key={s} value={String(s)}>Step {s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {selectedTemplate && (
                <div className="text-sm text-muted-foreground p-4 bg-[hsl(174,35%,93%)]/50 rounded-xl border border-[hsl(187,79%,23%)]/10">
                  Template has <span className="font-semibold text-[hsl(187,79%,23%)]">{selectedTemplate.supplements?.length || 0}</span> default supplement{selectedTemplate.supplements?.length !== 1 ? 's' : ''} and <span className="font-semibold text-[hsl(187,79%,23%)]">{selectedTemplate.default_months}</span> month{selectedTemplate.default_months !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-7">
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold">Duration</Label>
                <Input
                  type="number"
                  min={0.5}
                  max={12}
                  step={0.5}
                  value={monthCount}
                  onChange={(e) => setMonthCount(Math.max(0.5, parseFloat(e.target.value) || 1))}
                  data-testid="wizard-month-count-input"
                  className="h-12 w-36 font-mono text-lg"
                />
                <p className="text-sm text-muted-foreground">
                  In months. Use 0.5 for 2 weeks. Pre-filled from template.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-7">
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold">Patient Name</Label>
                <Input
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Enter patient name"
                  data-testid="wizard-patient-name-input"
                  className="h-12 text-base"
                  autoFocus
                />
              </div>
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold">Date</Label>
                <Input
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  data-testid="wizard-date-input"
                  className="h-12 w-52"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <h3 className="font-semibold text-lg text-[#0B0D10]">Review Plan Details</h3>
              <div className="grid grid-cols-2 gap-5 text-sm bg-[#F9FAFA] p-5 rounded-xl">
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Patient</span>
                  <div className="font-semibold text-base">{patientName}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Date</span>
                  <div className="font-semibold text-base">{planDate}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Program</span>
                  <div className="font-semibold text-base">{selectedProgram}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Step</span>
                  <div className="font-semibold text-base">Step {selectedStep}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Months</span>
                  <div className="font-semibold text-base">{monthCount}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Template Supplements</span>
                  <div className="font-semibold text-base">{selectedTemplate?.supplements?.length || 0}</div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-10 pt-7 border-t border-border/50">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="gap-2 h-11 px-6"
            >
              <ArrowLeft size={16} /> Back
            </Button>
            {step < 4 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="gap-2 h-11 px-6 bg-[hsl(187,79%,23%)] hover:bg-[hsl(187,79%,28%)] text-white font-semibold"
              >
                Next <ArrowRight size={16} />
              </Button>
            ) : (
              <Button
                onClick={handleCreate}
                disabled={creating}
                data-testid="wizard-create-plan-button"
                className="gap-2 h-11 px-8 bg-[#0B0D10] hover:bg-[#1a1d21] text-white font-semibold shadow-sm"
              >
                {creating ? 'Creating...' : 'Create Plan'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
