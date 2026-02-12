import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTemplates, createPlan } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';

const PROGRAMS = ['Detox 1', 'Detox 2', 'Maintenance'];
const STEPS = [1, 2, 3];

export default function NewPlanPage() {
  const [step, setStep] = useState(1); // wizard step
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
    <div className="p-8 max-w-[720px] mx-auto">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/')}
        className="mb-6 gap-2 text-muted-foreground"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </Button>

      <h1 className="text-xl font-semibold tracking-[-0.01em] text-[#0B0D10] mb-2">
        Create New Plan
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Set up a supplement protocol for your patient
      </p>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {wizardSteps.map((ws, i) => (
          <React.Fragment key={ws.num}>
            <div className={`flex items-center gap-2 ${
              step >= ws.num ? 'text-[hsl(187,79%,23%)]' : 'text-muted-foreground'
            }`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                step > ws.num
                  ? 'bg-[hsl(187,79%,23%)] text-white'
                  : step === ws.num
                  ? 'bg-[hsl(174,35%,93%)] text-[hsl(187,79%,23%)] ring-2 ring-[hsl(187,79%,23%)]'
                  : 'bg-[#EEF1F1] text-[#61746E]'
              }`}>
                {step > ws.num ? <Check size={14} /> : ws.num}
              </div>
              <span className="text-xs font-medium hidden sm:inline">{ws.label}</span>
            </div>
            {i < wizardSteps.length - 1 && (
              <div className={`flex-1 h-px ${
                step > ws.num ? 'bg-[hsl(187,79%,23%)]' : 'bg-border'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      <Card className="shadow-[var(--shadow-sm)] border-border/50">
        <CardContent className="p-6">
          {/* Step 1: Program & Step */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Program</Label>
                <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                  <SelectTrigger className="h-10" data-testid="wizard-program-select">
                    <SelectValue placeholder="Select a program" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROGRAMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Step</Label>
                <Select value={selectedStep} onValueChange={setSelectedStep}>
                  <SelectTrigger className="h-10" data-testid="wizard-step-select">
                    <SelectValue placeholder="Select a step" />
                  </SelectTrigger>
                  <SelectContent>
                    {STEPS.map(s => <SelectItem key={s} value={String(s)}>Step {s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {selectedTemplate && (
                <div className="text-xs text-muted-foreground p-3 bg-[#F6F7F7] rounded-lg">
                  Template has {selectedTemplate.supplements?.length || 0} default supplement{selectedTemplate.supplements?.length !== 1 ? 's' : ''} and {selectedTemplate.default_months} month{selectedTemplate.default_months !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Duration */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Number of Months</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={monthCount}
                  onChange={(e) => setMonthCount(Math.max(1, parseInt(e.target.value) || 1))}
                  data-testid="wizard-month-count-input"
                  className="h-10 w-32 font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Pre-filled from template defaults. Adjust as needed.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Patient Info */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Patient Name</Label>
                <Input
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Enter patient name"
                  data-testid="wizard-patient-name-input"
                  className="h-10"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date</Label>
                <Input
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  data-testid="wizard-date-input"
                  className="h-10 w-48"
                />
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-medium text-[#0B0D10]">Review Plan Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Patient:</span>
                  <span className="ml-2 font-medium">{patientName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <span className="ml-2 font-medium">{planDate}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Program:</span>
                  <span className="ml-2 font-medium">{selectedProgram}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Step:</span>
                  <span className="ml-2 font-medium">Step {selectedStep}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Months:</span>
                  <span className="ml-2 font-medium">{monthCount}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Template supplements:</span>
                  <span className="ml-2 font-medium">{selectedTemplate?.supplements?.length || 0}</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/50">
            <Button
              variant="ghost"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="gap-2"
            >
              <ArrowLeft size={16} /> Back
            </Button>
            {step < 4 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="gap-2"
              >
                Next <ArrowRight size={16} />
              </Button>
            ) : (
              <Button
                onClick={handleCreate}
                disabled={creating}
                data-testid="wizard-create-plan-button"
                className="gap-2"
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
