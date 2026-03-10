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
    try { const [tRes, sRes] = await Promise.all([getTemplates(), getSupplements('', true)]); setTemplates(tRes.templates || []); setSupplements(sRes.supplements || []); }
    catch (err) { toast.error('Failed to load data'); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
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
        <Button onClick={handleSave} disabled={saving || !currentTemplate}
          data-testid="admin-templates-save-button"
          className="gap-2.5 h-12 px-7 bg-[#0D5F68] hover:bg-[#0A4E55] text-white font-bold shadow-sm text-sm">
          <Save size={18} /> {saving ? 'Saving...' : 'Save Template'}
        </Button>
      </div>

      {/* Filter bar — warm amber tinted */}
      <div className="flex items-center gap-5 mb-8 p-6 rounded-2xl border-b-2 border-[#E2E8F0] border border-[#C8E6E0]">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#61746E] uppercase tracking-wider">Program</Label>
          <Select value={selectedProgram} onValueChange={setSelectedProgram}>
            <SelectTrigger className="w-[200px] h-12 text-sm" data-testid="admin-templates-program-select"><SelectValue /></SelectTrigger>
            <SelectContent>{PROGRAMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#61746E] uppercase tracking-wider">Step</Label>
          <Select value={selectedStep} onValueChange={setSelectedStep}>
            <SelectTrigger className="w-[140px] h-12 text-sm" data-testid="admin-templates-step-select"><SelectValue /></SelectTrigger>
            <SelectContent>{[1,2,3].map(s => <SelectItem key={s} value={String(s)}>Step {s}</SelectItem>)}</SelectContent>
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
              <TableRow className="hover:bg-transparent bg-[#FAFAFA]">
                <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4 px-6">Supplement</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4">Brand</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4">Default Dosage</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4">Instructions</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4 text-right">Cost</TableHead>
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
    </div>
  );
}
