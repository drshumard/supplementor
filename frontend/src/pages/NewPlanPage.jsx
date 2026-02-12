import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTemplates, createPlan } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';

const PROGRAMS = ['Detox 1', 'Detox 2', 'Maintenance'];
const STEPS = [1, 2, 3];

export default function NewPlanPage() {
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedStep, setSelectedStep] = useState('');
  const [monthCount, setMonthCount] = useState(1);
  const [patientName, setPatientName] = useState('');
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0]);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getTemplates().then(r => setTemplates(r.templates || [])).catch(() => {});
  }, []);

  const selectedTemplate = templates.find(
    t => t.program_name === selectedProgram && t.step_number === Number(selectedStep)
  );

  useEffect(() => {
    if (selectedTemplate) {
      setMonthCount(selectedTemplate.default_months || 1);
    }
  }, [selectedTemplate]);

  const canProceed = () => {
    if (step === 1) return selectedProgram && selectedStep;
    if (step === 2) return monthCount >= 1;
    if (step === 3) return patientName.trim().length > 0;
    return true;
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const data = {
        patient_name: patientName.trim(),
        date: planDate,
        program_name: selectedProgram,
        step_label: `Step ${selectedStep}`,
        step_number: Number(selectedStep),
        template_id: selectedTemplate?._id || null,
        months: Array.from({ length: monthCount }, (_, i) => ({
          month_number: i + 1,
          supplements: (selectedTemplate?.supplements || []).map(s => ({
            supplement_id: s.supplement_id || '',
            supplement_name: s.supplement_name,
            company: s.company || '',
            quantity_per_dose: s.quantity_per_dose || null,
            frequency_per_day: s.frequency_per_day || null,
            dosage_display: s.dosage_display || '',
            instructions: s.instructions || '',
            with_food: true,
            hc_notes: '',
            units_per_bottle: s.units_per_bottle || null,
            cost_per_bottle: s.cost_per_bottle || 0,
            refrigerate: s.refrigerate || false,
            bottles_needed: null,
            calculated_cost: null,
            bottles_per_month_override: null,
          })),
          monthly_total_cost: 0,
        })),
      };
      const result = await createPlan(data);
      toast.success('Plan created');
      navigate(`/plans/${result._id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to create plan');
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
              step >= ws.num ? 'text-[hsl(187,79%,23%)]' : 'text-muted-foreground'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                step > ws.num
                  ? 'bg-[hsl(187,79%,23%)] text-white shadow-sm'
                  : step === ws.num
                  ? 'bg-[hsl(174,35%,93%)] text-[hsl(187,79%,23%)] ring-2 ring-[hsl(187,79%,23%)]'
                  : 'bg-[#EEF1F1] text-[#61746E]'
              }`}>
                {step > ws.num ? <Check size={14} /> : ws.num}
              </div>
              <span className="text-xs font-semibold hidden sm:inline">{ws.label}</span>
            </div>
            {i < wizardSteps.length - 1 && (
              <div className={`flex-1 h-[2px] rounded ${
                step > ws.num ? 'bg-[hsl(187,79%,23%)]' : 'bg-border'
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
                    {PROGRAMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
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
                    {STEPS.map(s => <SelectItem key={s} value={String(s)}>Step {s}</SelectItem>)}
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
                <Label className="text-sm font-semibold">Number of Months</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={monthCount}
                  onChange={(e) => setMonthCount(Math.max(1, parseInt(e.target.value) || 1))}
                  data-testid="wizard-month-count-input"
                  className="h-12 w-36 font-mono text-lg"
                />
                <p className="text-sm text-muted-foreground">
                  Pre-filled from template defaults. Adjust as needed.
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
