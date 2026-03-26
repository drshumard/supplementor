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
    setCurrentTemplate(tmpl || null); setEditMonths(tmpl?.default_months || 1); setEditSupps(tmpl?.supplements || []);
  }, [selectedProgram, selectedStep, templates]);

  const addTemplateSupp = (supp) => {
    setEditSupps([...editSupps, {
      supplement_id: supp._id, supplement_name: supp.supplement_name, company: supp.company || '',
      quantity_per_dose: supp.default_quantity_per_dose || null, frequency_per_day: supp.default_frequency_per_day || null,
      dosage_display: supp.default_dosage_display || '', instructions: supp.default_instructions || '',
      units_per_bottle: supp.units_per_bottle || null, cost_per_bottle: supp.cost_per_bottle || 0, refrigerate: supp.refrigerate || false,
    }]);
    setSearchOpen(false); setSearchQuery('');
  };

  const handleSave = async () => {
    if (!currentTemplate) return;
    setSaving(true);
    try { await updateTemplate(currentTemplate._id, { default_months: editMonths, supplements: editSupps }); toast.success('Template saved'); fetchData(); }
    catch (err) { toast.error('Save failed'); }
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
          <div className="ml-auto">
            <Badge className="bg-[#0D5F68] text-white hover:bg-[#0D5F68] px-4 py-2 text-xs font-bold">
              <Layers size={13} className="mr-2" /> {editSupps.length} supplement{editSupps.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        )}
      </div>

      {currentTemplate ? (
        <div className="rounded-xl border border-[#E2E8F0] bg-white card-elevated overflow-hidden" data-testid="admin-templates-table">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#0D5F68] hover:bg-[#0D5F68] rounded-t-xl">
                <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-4 px-6">Supplement</TableHead>
                <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-4">Brand</TableHead>
                <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-4">Default Dosage</TableHead>
                <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-4">Instructions</TableHead>
                <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-4 text-right">Cost</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editSupps.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <Layers size={36} strokeWidth={1} className="mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm">No supplements in this template</p>
                </TableCell></TableRow>
              ) : (
                editSupps.map((supp, idx) => (
                  <TableRow key={idx} className="hover:bg-[#F0FAFA] group">
                    <TableCell className="font-bold text-sm text-[#0B0D10] py-5 px-6">{supp.supplement_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground py-5">{supp.company}</TableCell>
                    <TableCell className="text-sm py-5">{supp.dosage_display || '-'}</TableCell>
                    <TableCell className="text-sm py-5">{supp.instructions || '-'}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-sm font-bold text-[#147D5A] py-5">{formatCurrency(supp.cost_per_bottle)}</TableCell>
                    <TableCell className="py-5">
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-[#C53030] hover:bg-red-50 rounded-lg"
                        onClick={() => setEditSupps(editSupps.filter((_, i) => i !== idx))}><Trash2 size={14} /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="p-5 border-t border-border/30">
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2.5 text-sm text-muted-foreground w-full justify-start h-12 rounded-xl border-dashed hover:border-[#0D5F68]/40 hover:border-b-2 border-[#E2E8F0]">
                  <Plus size={16} className="text-[#0D5F68]" /> Add supplement to template...
                  <ChevronsUpDown size={13} className="ml-auto" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[460px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search supplements..." value={searchQuery} onValueChange={setSearchQuery} />
                  <CommandList>
                    <CommandEmpty>No supplements found.</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-y-auto">
                      {filteredSupps.slice(0, 30).map(supp => (
                        <CommandItem key={supp._id} value={supp.supplement_name} onSelect={() => addTemplateSupp(supp)}
                          className="flex items-center justify-between cursor-pointer py-3">
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
