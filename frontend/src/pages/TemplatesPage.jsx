import React, { useState, useEffect, useCallback } from 'react';
import { getTemplates, updateTemplate, createTemplate, deleteTemplate, getSupplements } from '../lib/api';
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';

const DEFAULT_PROGRAMS = ['Detox 1', 'Detox 2', 'Maintenance'];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);

function MonthAddSupplement({ monthNum, supplements, onAdd }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = supplements.filter(s =>
    s.supplement_name.toLowerCase().includes(q.toLowerCase()) || s.company?.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-xs text-muted-foreground w-full justify-start h-8 border-dashed">
          <Plus size={12} /> Add supplement...
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." value={q} onValueChange={setQ} />
          <CommandList><CommandEmpty>None found.</CommandEmpty>
            <CommandGroup className="max-h-[250px] overflow-y-auto">
              {filtered.slice(0, 25).map(s => (
                <CommandItem key={s._id} value={s.supplement_name}
                  onSelect={() => { onAdd(monthNum, s); setOpen(false); setQ(''); }}
                  className="flex items-center justify-between cursor-pointer py-2">
                  <div><div className="text-sm font-medium">{s.supplement_name}</div><div className="text-xs text-muted-foreground">{s.company}</div></div>
                  <span className="text-xs font-mono text-muted-foreground">{formatCurrency(s.cost_per_bottle)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

  const [supplements, setSupplements] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedStep, setSelectedStep] = useState('1');
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [editMonths, setEditMonths] = useState(1);
  const [editSupps, setEditSupps] = useState([]);
  const [saving, setSaving] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ program_name: '', step_number: 1, default_months: 1 });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteSupp, setDeleteSupp] = useState(null); // {monthNum, idx, name}
  const [deleteFromAll, setDeleteFromAll] = useState(false);

  // Derive unique program names from templates + defaults
  const programNames = [...new Set([...DEFAULT_PROGRAMS, ...templates.map(t => t.program_name)])].sort();

  // Derive available steps for the selected program
  const availableSteps = [...new Set(templates.filter(t => t.program_name === selectedProgram).map(t => t.step_number))].sort((a, b) => a - b);

  const fetchData = useCallback(async () => {
    try { const [tRes, sRes] = await Promise.all([getTemplates(), getSupplements('', true)]); setTemplates(tRes.templates || []); setSupplements(sRes.supplements || []); }
    catch (err) { toast.error('Failed to load data'); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  
  // Auto-select first program when templates load and nothing is selected
  useEffect(() => {
    if (!selectedProgram && programNames.length > 0) {
      setSelectedProgram(programNames[0]);
    }
  }, [programNames, selectedProgram]);

  useEffect(() => {
    const tmpl = templates.find(t => t.program_name === selectedProgram && t.step_number === Number(selectedStep));
    setCurrentTemplate(tmpl || null);
    setEditMonths(tmpl?.default_months || 1);
    // Use months array if available, fall back to flat supplements
    setEditSupps(tmpl?.months || []);
  }, [selectedProgram, selectedStep, templates]);

  const addTemplateSupp = (monthNum, supp) => {
    setEditSupps(prev => prev.map(m => {
      if (m.month_number !== monthNum) return m;
      return { ...m, supplements: [...(m.supplements || []), {
        supplement_id: supp._id, supplement_name: supp.supplement_name, company: supp.company || '',
        supplier: supp.supplier || '', unit_type: supp.unit_type || 'caps',
        quantity_per_dose: supp.default_quantity_per_dose || null, frequency_per_day: supp.default_frequency_per_day || null,
        dosage_display: supp.default_dosage_display || '', instructions: supp.default_instructions || '',
        units_per_bottle: supp.units_per_bottle || null, cost_per_bottle: supp.cost_per_bottle || 0, refrigerate: supp.refrigerate || false,
      }]};
    }));
  };

  const addToAllMonths = (supp) => {
    const entry = {
      supplement_id: supp._id, supplement_name: supp.supplement_name, company: supp.company || '',
      supplier: supp.supplier || '', unit_type: supp.unit_type || 'caps',
      quantity_per_dose: supp.default_quantity_per_dose || null, frequency_per_day: supp.default_frequency_per_day || null,
      dosage_display: supp.default_dosage_display || '', instructions: supp.default_instructions || '',
      units_per_bottle: supp.units_per_bottle || null, cost_per_bottle: supp.cost_per_bottle || 0, refrigerate: supp.refrigerate || false,
    };
    setEditSupps(prev => prev.map(m => ({
      ...m, supplements: [...(m.supplements || []), { ...entry }]
    })));
  };

  const removeTemplateSupp = (monthNum, idx) => {
    setEditSupps(prev => prev.map(m => {
      if (m.month_number !== monthNum) return m;
      return { ...m, supplements: (m.supplements || []).filter((_, i) => i !== idx) };
    }));
  };

  const removeFromAllMonths = (suppName) => {
    setEditSupps(prev => prev.map(m => ({
      ...m, supplements: (m.supplements || []).filter(s => s.supplement_name !== suppName)
    })));
    toast.success(`Removed "${suppName}" from all months`);
  };

  const handleSave = async () => {
    if (!currentTemplate) return;
    setSaving(true);
    try {
      await updateTemplate(currentTemplate._id, { default_months: editMonths, months: editSupps });
      toast.success('Template saved'); fetchData();
    } catch (err) { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const handleCreate = async () => {
    if (!newTemplate.program_name.trim()) { toast.error('Program name is required'); return; }
    try {
      await createTemplate(newTemplate);
      toast.success('Template created');
      // Auto-select the new template
      setSelectedProgram(newTemplate.program_name.trim());
      setSelectedStep(String(newTemplate.step_number));
      setAddOpen(false);
      setNewTemplate({ program_name: '', step_number: 1, default_months: 1 });
      fetchData();
    } catch (err) { toast.error(err.message || 'Create failed'); }
  };

  const handleDeleteTemplate = async () => {
    if (!currentTemplate) return;
    try {
      await deleteTemplate(currentTemplate._id);
      toast.success('Template deleted');
      setConfirmDelete(false);
      fetchData();
    } catch (err) { toast.error(err.message || 'Delete failed'); }
  };


  const filteredSupps = supplements.filter(s =>
    s.supplement_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-10 max-w-[1560px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#0B0D10]">Protocol Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage default supplement lists for each program and step</p>
        </div>
        <div className="flex items-center gap-3">
          {currentTemplate && (
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}
              className="gap-2 h-10 px-4 text-sm text-[#C53B3B] hover:bg-red-50">
              <Trash2 size={15} /> Delete Template
            </Button>
          )}
          <Button onClick={() => setAddOpen(true)}
            className="gap-2.5 h-12 px-6 bg-[#0B0D10] hover:bg-[#1a1d21] text-white font-bold shadow-sm text-sm">
            <Plus size={18} /> New Template
          </Button>
          <Button onClick={handleSave} disabled={saving || !currentTemplate}
            data-testid="admin-templates-save-button"
            className="gap-2.5 h-12 px-7 bg-[#0D5F68] hover:bg-[#0A4E55] text-white font-bold shadow-sm text-sm">
            <Save size={18} /> {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>

      {/* Filter bar — warm amber tinted */}
      <div className="flex items-center gap-5 mb-8 p-6 rounded-2xl border-b-2 border-[#E2E8F0] border border-[#C8E6E0]">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#61746E] uppercase tracking-wider">Program</Label>
          <Select value={selectedProgram} onValueChange={setSelectedProgram}>
            <SelectTrigger className="w-[200px] h-12 text-sm" data-testid="admin-templates-program-select"><SelectValue /></SelectTrigger>
            <SelectContent>{programNames.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#61746E] uppercase tracking-wider">Step</Label>
          <Select value={selectedStep} onValueChange={setSelectedStep}>
            <SelectTrigger className="w-[140px] h-12 text-sm" data-testid="admin-templates-step-select"><SelectValue /></SelectTrigger>
            <SelectContent>{[...new Set([1,2,3, ...availableSteps])].sort((a,b) => a-b).map(s => <SelectItem key={s} value={String(s)}>Step {s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#61746E] uppercase tracking-wider">Default Months</Label>
          <Input type="number" min={1} max={12} value={editMonths}
            onChange={(e) => setEditMonths(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-[100px] h-12 font-mono text-sm" />
        </div>
        {currentTemplate && (
          <div className="ml-auto flex items-center gap-2">
            <Badge className="bg-[#0D5F68] text-white hover:bg-[#0D5F68] px-4 py-2 text-xs font-bold">
              <Layers size={13} className="mr-2" /> {editSupps.length} month{editSupps.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        )}
      </div>

      {currentTemplate ? (
        <div>
          {/* Add to all months */}
          <div className="flex items-center gap-3 mb-4">
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" className="gap-2 h-9 px-4 text-xs font-semibold bg-[#0D5F68] hover:bg-[#0A4E55] text-white">
                  <Plus size={14} /> Add to all months
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[460px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search supplements..." value={searchQuery} onValueChange={setSearchQuery} />
                  <CommandList>
                    <CommandEmpty>No supplements found.</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-y-auto">
                      {filteredSupps.slice(0, 30).map(supp => (
                        <CommandItem key={supp._id} value={supp.supplement_name} onSelect={() => { addToAllMonths(supp); setSearchOpen(false); setSearchQuery(''); }}
                          className="flex items-center justify-between cursor-pointer py-2.5">
                          <div><div className="text-sm font-medium">{supp.supplement_name}</div><div className="text-xs text-muted-foreground">{supp.company}</div></div>
                          <span className="text-xs font-mono text-muted-foreground">{formatCurrency(supp.cost_per_bottle)}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Month sections */}
          {editSupps.map((month) => (
            <div key={month.month_number} className="rounded-xl border border-[#E2E8F0] bg-white card-elevated mb-6 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-[#0D5F68]">
                <h3 className="text-sm font-bold text-white">
                  {month.month_number === 0.5 ? '2 Weeks' : `Month ${month.month_number}`}
                </h3>
                <span className="text-xs text-white/60">{(month.supplements || []).length} supplement{(month.supplements || []).length !== 1 ? 's' : ''}</span>
              </div>
              <div>
                {(month.supplements || []).map((supp, idx) => (
                  <div key={idx} className="flex items-center px-5 py-2 border-b border-[#F0F2F4] last:border-b-0 hover:bg-[#F8FAFB] group gap-4">
                    <span className="text-[12px] font-bold text-[#0B0D10] flex-1 min-w-0 truncate">{supp.supplement_name}</span>
                    <span className="text-[11px] text-[#718096] w-[120px] truncate">{supp.dosage_display || '-'}</span>
                    <span className="text-[11px] text-[#718096] w-[120px] truncate">{supp.instructions || '-'}</span>
                    <span className="font-mono text-[11px] font-bold text-[#147D5A] w-[60px] text-right">{formatCurrency(supp.cost_per_bottle)}</span>
                    <button className="h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[#94A3B8] hover:text-[#C53B3B] transition-opacity"
                      onClick={() => { setDeleteSupp({ monthNum: month.month_number, idx, name: supp.supplement_name }); setDeleteFromAll(false); }}><Trash2 size={12} /></button>
                  </div>
                ))}
                {(month.supplements || []).length === 0 && (
                  <div className="px-5 py-8 text-center text-sm text-muted-foreground">No supplements. Add below.</div>
                )}
              </div>
              <div className="p-3 border-t border-[#F0F2F4]">
                <MonthAddSupplement monthNum={month.month_number} supplements={supplements} onAdd={addTemplateSupp} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 rounded-2xl border border-dashed border-b-2 border-[#E2E8F0]">
          <Layers size={48} strokeWidth={1} className="mx-auto mb-4 text-[#0D5F68]/40" />
          <p className="text-base font-bold text-[#0B0D10]">No template found</p>
          <p className="text-sm text-muted-foreground mt-1">Select a program and step above</p>
        </div>
      )}

      {/* Create Template Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-[400px] p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">New Protocol Template</DialogTitle>
            <DialogDescription className="text-xs">Create a new template, then add supplements to it.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Program Name *</Label>
              <Input value={newTemplate.program_name} onChange={(e) => setNewTemplate({...newTemplate, program_name: e.target.value})}
                className="h-9 text-sm" placeholder="e.g. Detox 1, Maintenance" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Step Number</Label>
                <Input type="number" min={1} value={newTemplate.step_number}
                  onChange={(e) => setNewTemplate({...newTemplate, step_number: parseInt(e.target.value) || 1})}
                  className="h-9 text-sm font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Default Months</Label>
                <Input type="number" min={0.5} step={0.5} value={newTemplate.default_months}
                  onChange={(e) => setNewTemplate({...newTemplate, default_months: parseFloat(e.target.value) || 1})}
                  className="h-9 text-sm font-mono" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-3 pt-3 border-t">
            <Button variant="outline" onClick={() => setAddOpen(false)} className="h-9 px-4 text-sm">Cancel</Button>
            <Button onClick={handleCreate} className="h-9 px-5 bg-[#0D5F68] hover:bg-[#0A4E55] text-white font-semibold text-sm">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Delete Supplement Confirm */}
      <AlertDialog open={!!deleteSupp} onOpenChange={() => { setDeleteSupp(null); setDeleteFromAll(false); }}>
        <AlertDialogContent className="p-7">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Remove supplement?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm mt-2">
              {deleteSupp ? `Remove "${deleteSupp.name}" from this template.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="flex items-center gap-3 mt-4 cursor-pointer select-none">
            <input type="checkbox" checked={deleteFromAll} onChange={(e) => setDeleteFromAll(e.target.checked)}
              className="w-4 h-4 rounded border-[#C8E6E0] text-[#0D5F68] focus:ring-[#0D5F68]" />
            <span className="text-sm text-[#334155]">Remove from all months</span>
          </label>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel className="h-10 px-5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (deleteSupp) {
                if (deleteFromAll) { removeFromAllMonths(deleteSupp.name); }
                else { removeTemplateSupp(deleteSupp.monthNum, deleteSupp.idx); }
              }
              setDeleteSupp(null); setDeleteFromAll(false);
            }} className="bg-[#C53B3B] text-white hover:bg-[#A52E2E] h-10 px-5 font-semibold">
              {deleteFromAll ? 'Remove from all months' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Template Confirm */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="p-7">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Delete this template?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm mt-2">This will delete "{currentTemplate?.program_name} Step {currentTemplate?.step_number}" and all its supplements.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel className="h-10 px-5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate} className="bg-[#C53B3B] text-white hover:bg-[#A52E2E] h-10 px-5 font-semibold">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
