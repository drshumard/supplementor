import React, { useState, useEffect, useCallback } from 'react';
import { getTemplates, updateTemplate, getSupplements } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '../components/ui/command';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '../components/ui/popover';
import { Plus, Trash2, Save, ChevronsUpDown, Layers } from 'lucide-react';
import { toast } from 'sonner';

const PROGRAMS = ['Detox 1', 'Detox 2', 'Maintenance'];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [supplements, setSupplements] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState('Detox 1');
  const [selectedStep, setSelectedStep] = useState('1');
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [editMonths, setEditMonths] = useState(1);
  const [editSupps, setEditSupps] = useState([]);
  const [saving, setSaving] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [tRes, sRes] = await Promise.all([getTemplates(), getSupplements('', true)]);
      setTemplates(tRes.templates || []);
      setSupplements(sRes.supplements || []);
    } catch (err) {
      toast.error('Failed to load data');
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const tmpl = templates.find(
      t => t.program_name === selectedProgram && t.step_number === Number(selectedStep)
    );
    setCurrentTemplate(tmpl || null);
    setEditMonths(tmpl?.default_months || 1);
    setEditSupps(tmpl?.supplements || []);
  }, [selectedProgram, selectedStep, templates]);

  const addTemplateSupp = (supp) => {
    const entry = {
      supplement_id: supp._id,
      supplement_name: supp.supplement_name,
      company: supp.company || '',
      quantity_per_dose: supp.default_quantity_per_dose || null,
      frequency_per_day: supp.default_frequency_per_day || null,
      dosage_display: supp.default_dosage_display || '',
      instructions: supp.default_instructions || '',
      units_per_bottle: supp.units_per_bottle || null,
      cost_per_bottle: supp.cost_per_bottle || 0,
      refrigerate: supp.refrigerate || false,
    };
    setEditSupps([...editSupps, entry]);
    setSearchOpen(false);
    setSearchQuery('');
  };

  const removeTemplateSupp = (index) => {
    setEditSupps(editSupps.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!currentTemplate) return;
    setSaving(true);
    try {
      await updateTemplate(currentTemplate._id, {
        default_months: editMonths,
        supplements: editSupps,
      });
      toast.success('Template saved');
      fetchData();
    } catch (err) {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const filteredSupps = supplements.filter(s =>
    s.supplement_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-10 max-w-[1560px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#0B0D10]">Protocol Templates</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Manage default supplement lists for each program and step</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !currentTemplate}
          data-testid="admin-templates-save-button"
          className="gap-2.5 h-11 px-6 bg-[hsl(187,79%,23%)] hover:bg-[hsl(187,79%,28%)] text-white font-semibold shadow-sm"
        >
          <Save size={18} /> {saving ? 'Saving...' : 'Save Template'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-5 mb-8 p-5 rounded-xl bg-[#F9FAFA] border border-border/40">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Program</Label>
          <Select value={selectedProgram} onValueChange={setSelectedProgram}>
            <SelectTrigger className="w-[200px] h-11 text-sm" data-testid="admin-templates-program-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROGRAMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Step</Label>
          <Select value={selectedStep} onValueChange={setSelectedStep}>
            <SelectTrigger className="w-[140px] h-11 text-sm" data-testid="admin-templates-step-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1,2,3].map(s => <SelectItem key={s} value={String(s)}>Step {s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Default Months</Label>
          <Input
            type="number"
            min={1}
            max={12}
            value={editMonths}
            onChange={(e) => setEditMonths(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-[100px] h-11 font-mono text-sm"
          />
        </div>
        {currentTemplate && (
          <div className="ml-auto flex items-center gap-2">
            <Badge className="bg-[hsl(174,35%,93%)] text-[hsl(187,79%,23%)] hover:bg-[hsl(174,35%,93%)] px-3 py-1.5 text-xs font-semibold">
              <Layers size={12} className="mr-1.5" />
              {editSupps.length} supplement{editSupps.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        )}
      </div>

      {currentTemplate ? (
        <div className="rounded-xl border bg-card shadow-[var(--shadow-sm)] overflow-hidden" data-testid="admin-templates-table">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-[#FAFBFB]">
                <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4 px-5">Supplement</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4">Brand</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4">Default Dosage</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4">Instructions</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4 text-right">Cost</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editSupps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <Layers size={36} strokeWidth={1} className="text-muted-foreground/50" />
                      <p className="text-sm">No supplements in this template</p>
                      <p className="text-xs text-muted-foreground">Add supplements using the button below</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                editSupps.map((supp, idx) => (
                  <TableRow key={idx} className="hover:bg-[hsl(174,35%,93%)]/30 group">
                    <TableCell className="font-semibold text-sm text-[#0B0D10] py-4 px-5">{supp.supplement_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground py-4">{supp.company}</TableCell>
                    <TableCell className="text-sm py-4">{supp.dosage_display || '-'}</TableCell>
                    <TableCell className="text-sm py-4">{supp.instructions || '-'}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-sm font-semibold text-[#147D5A] py-4">{formatCurrency(supp.cost_per_bottle)}</TableCell>
                    <TableCell className="py-4">
                      <Button variant="ghost" size="sm"
                        className="h-9 w-9 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg"
                        onClick={() => removeTemplateSupp(idx)}>
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="p-4 border-t border-border/50">
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2.5 text-sm text-muted-foreground w-full justify-start h-11 rounded-lg">
                  <Plus size={16} /> Add supplement to template...
                  <ChevronsUpDown size={13} className="ml-auto" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[440px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search supplements..." value={searchQuery} onValueChange={setSearchQuery} />
                  <CommandList>
                    <CommandEmpty>No supplements found.</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-y-auto">
                      {filteredSupps.slice(0, 30).map(supp => (
                        <CommandItem key={supp._id} value={supp.supplement_name} onSelect={() => addTemplateSupp(supp)}
                          className="flex items-center justify-between cursor-pointer py-3">
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
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground rounded-xl border border-dashed bg-[#F9FAFA]">
          <Layers size={48} strokeWidth={1} className="mx-auto mb-4 text-muted-foreground/40" />
          <p className="text-base font-medium text-[#0B0D10]">No template found</p>
          <p className="text-sm text-muted-foreground mt-1">Select a program and step above to edit its template</p>
        </div>
      )}
    </div>
  );
}
