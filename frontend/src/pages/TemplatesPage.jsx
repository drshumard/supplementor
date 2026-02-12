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
import { Plus, Trash2, Save, ChevronsUpDown } from 'lucide-react';
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
    <div className="p-8 max-w-[1560px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.01em] text-[#0B0D10]">Protocol Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage default supplement lists for each program and step</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !currentTemplate}
          className="gap-2"
          data-testid="admin-templates-save-button"
        >
          <Save size={16} /> {saving ? 'Saving...' : 'Save Template'}
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Program</Label>
          <Select value={selectedProgram} onValueChange={setSelectedProgram}>
            <SelectTrigger className="w-[180px] h-9" data-testid="admin-templates-program-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROGRAMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Step</Label>
          <Select value={selectedStep} onValueChange={setSelectedStep}>
            <SelectTrigger className="w-[120px] h-9" data-testid="admin-templates-step-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1,2,3].map(s => <SelectItem key={s} value={String(s)}>Step {s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Default Months</Label>
          <Input
            type="number"
            min={1}
            max={12}
            value={editMonths}
            onChange={(e) => setEditMonths(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-[80px] h-9 font-mono"
          />
        </div>
      </div>

      {currentTemplate ? (
        <div className="rounded-xl border bg-card shadow-[var(--shadow-sm)]" data-testid="admin-templates-table">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground">Supplement</TableHead>
                <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground">Brand</TableHead>
                <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground">Default Dosage</TableHead>
                <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground">Instructions</TableHead>
                <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground text-right">Cost</TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editSupps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground text-sm">
                    No supplements in this template. Add some below.
                  </TableCell>
                </TableRow>
              ) : (
                editSupps.map((supp, idx) => (
                  <TableRow key={idx} className="hover:bg-[var(--table-zebra)] group">
                    <TableCell className="font-medium text-sm">{supp.supplement_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{supp.company}</TableCell>
                    <TableCell className="text-sm">{supp.dosage_display || '-'}</TableCell>
                    <TableCell className="text-sm">{supp.instructions || '-'}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-sm">{formatCurrency(supp.cost_per_bottle)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        onClick={() => removeTemplateSupp(idx)}>
                        <Trash2 size={13} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="p-3 border-t border-border/50">
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-xs text-muted-foreground w-full justify-start">
                  <Plus size={14} /> Add supplement to template...
                  <ChevronsUpDown size={12} className="ml-auto" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search supplements..." value={searchQuery} onValueChange={setSearchQuery} />
                  <CommandList>
                    <CommandEmpty>No supplements found.</CommandEmpty>
                    <CommandGroup className="max-h-[280px] overflow-y-auto">
                      {filteredSupps.slice(0, 30).map(supp => (
                        <CommandItem key={supp._id} value={supp.supplement_name} onSelect={() => addTemplateSupp(supp)}
                          className="flex items-center justify-between cursor-pointer">
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
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Select a program and step to edit</p>
        </div>
      )}
    </div>
  );
}
