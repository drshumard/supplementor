import React, { useState, useEffect, useCallback } from 'react';
import { getSupplements, createSupplement, updateSupplement, deleteSupplement } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, Snowflake, Pill } from 'lucide-react';
import { toast } from 'sonner';

const emptySupp = {
  supplement_name: '', company: '', units_per_bottle: '', unit_type: 'caps',
  default_quantity_per_dose: '', default_frequency_per_day: '', default_dosage_display: '',
  cost_per_bottle: '', default_instructions: '', refrigerate: false, notes: '', bottles_per_month: '', active: true,
};

export default function SupplementsPage() {
  const [supplements, setSupplements] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState(emptySupp);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const res = await getSupplements(search, false); setSupplements(res.supplements || []); setTotal(res.total || 0); }
    catch (err) { toast.error('Failed to load supplements'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => { setEditId(null); setEditData({ ...emptySupp }); setEditOpen(true); };
  const openEdit = (supp) => {
    setEditId(supp._id);
    setEditData({
      supplement_name: supp.supplement_name || '', company: supp.company || '',
      units_per_bottle: supp.units_per_bottle ?? '', unit_type: supp.unit_type || 'caps',
      default_quantity_per_dose: supp.default_quantity_per_dose ?? '',
      default_frequency_per_day: supp.default_frequency_per_day ?? '',
      default_dosage_display: supp.default_dosage_display || '',
      cost_per_bottle: supp.cost_per_bottle ?? '', default_instructions: supp.default_instructions || '',
      refrigerate: supp.refrigerate || false, notes: supp.notes || '',
      bottles_per_month: supp.bottles_per_month ?? '', active: supp.active !== false,
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editData.supplement_name.trim()) { toast.error('Supplement name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...editData,
        units_per_bottle: editData.units_per_bottle ? parseInt(editData.units_per_bottle) : null,
        default_quantity_per_dose: editData.default_quantity_per_dose ? parseInt(editData.default_quantity_per_dose) : null,
        default_frequency_per_day: editData.default_frequency_per_day ? parseInt(editData.default_frequency_per_day) : null,
        cost_per_bottle: editData.cost_per_bottle ? parseFloat(editData.cost_per_bottle) : 0,
        bottles_per_month: editData.bottles_per_month ? parseFloat(editData.bottles_per_month) : null,
      };
      if (editId) { await updateSupplement(editId, payload); toast.success('Updated'); }
      else { await createSupplement(payload); toast.success('Added'); }
      setEditOpen(false); fetchData();
    } catch (err) { toast.error(err.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteSupplement(deleteId); toast.success('Deleted'); fetchData(); }
    catch (err) { toast.error('Delete failed'); }
    finally { setDeleteId(null); }
  };

  return (
    <div className="p-10 max-w-[1560px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#0B0D10]">Master Supplement List</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} supplement{total !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openAdd} className="gap-2.5 h-12 px-7 bg-[#0B0D10] hover:bg-[#1a1d21] text-white font-bold shadow-sm text-sm" data-testid="admin-supplements-add-button">
          <Plus size={18} /> Add Supplement
        </Button>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-5 mb-6">
        <div className="rounded-xl border-b-2 border-[#E2E8F0] border border-[#C8E6E0] px-5 py-3 flex items-center gap-3">
          <Pill size={16} className="text-[#0D5F68]" />
          <span className="text-sm font-semibold text-[#61746E]">{total} Total</span>
        </div>
        <div className="rounded-xl bg-[#E8F5E9] border border-[#C8E6C9] px-5 py-3 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#147D5A]"></span>
          <span className="text-sm font-semibold text-[#2E7D32]">{supplements.filter(s => s.active !== false).length} Active</span>
        </div>
      </div>

      <div className="relative max-w-[400px] mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search supplements..." value={search} onChange={(e) => setSearch(e.target.value)}
          data-testid="admin-supplements-search-input" className="pl-11 h-12" />
      </div>

      <div className="rounded-xl border border-[#E2E8F0] bg-white card-elevated overflow-hidden" data-testid="admin-supplements-table">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-[#FAFAFA]">
              <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4 px-6">Name</TableHead>
              <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4">Brand</TableHead>
              <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4">Size</TableHead>
              <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4">Default Dosage</TableHead>
              <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4 text-right">Price</TableHead>
              <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4">Btls/Mo</TableHead>
              <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4">Status</TableHead>
              <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4 w-[110px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="h-40 text-center text-muted-foreground">
                <div className="flex items-center justify-center gap-3"><div className="w-5 h-5 border-2 border-[#0D5F68] border-t-transparent rounded-full animate-spin" /> Loading...</div>
              </TableCell></TableRow>
            ) : supplements.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-40 text-center text-muted-foreground text-base">No supplements found</TableCell></TableRow>
            ) : (
              supplements.map(supp => (
                <TableRow key={supp._id} className="hover:bg-[#F0FAFA]">
                  <TableCell className="py-5 px-6">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-sm text-[#0B0D10]">{supp.supplement_name}</span>
                      {supp.refrigerate && <Snowflake size={13} className="text-blue-500" />}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground py-5">{supp.company}</TableCell>
                  <TableCell className="font-mono tabular-nums text-sm py-5">{supp.units_per_bottle || '-'} {supp.unit_type}</TableCell>
                  <TableCell className="text-sm py-5">{supp.default_dosage_display || '-'}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-sm font-bold text-[#147D5A] py-5">{formatCurrency(supp.cost_per_bottle)}</TableCell>
                  <TableCell className="font-mono tabular-nums text-sm py-5">{supp.bottles_per_month ?? '-'}</TableCell>
                  <TableCell className="py-5">
                    <Badge className={`px-3 py-1.5 text-[10px] font-bold ${
                      supp.active !== false
                        ? 'bg-[#147D5A] text-white hover:bg-[#147D5A]'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-200'}`}>
                      {supp.active !== false ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-5">
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg hover:bg-[#E0F2F1] text-muted-foreground hover:text-[#0D5F68]" onClick={() => openEdit(supp)}><Pencil size={15} /></Button>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg text-muted-foreground hover:text-[#C53030] hover:bg-red-50" onClick={() => setDeleteId(supp._id)}><Trash2 size={15} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit/Add Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[600px] max-h-[85vh] overflow-y-auto p-7">
          <DialogHeader>
            <DialogTitle className="text-lg">{editId ? 'Edit Supplement' : 'Add Supplement'}</DialogTitle>
            <DialogDescription className="text-sm mt-1">Fill in the supplement details below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2 col-span-2">
                <Label className="text-sm font-semibold">Supplement Name *</Label>
                <Input value={editData.supplement_name} onChange={(e) => setEditData({...editData, supplement_name: e.target.value})} className="h-12" />
              </div>
              <div className="space-y-2"><Label className="text-sm font-semibold">Company / Brand</Label><Input value={editData.company} onChange={(e) => setEditData({...editData, company: e.target.value})} className="h-12" /></div>
              <div className="space-y-2"><Label className="text-sm font-semibold">Unit Type</Label>
                <Select value={editData.unit_type} onValueChange={(v) => setEditData({...editData, unit_type: v})}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="caps">Capsules (caps)</SelectItem>
                    <SelectItem value="ml">Milliliters (ml)</SelectItem>
                    <SelectItem value="serving">Serving</SelectItem>
                    <SelectItem value="scoop">Scoop</SelectItem>
                    <SelectItem value="pump">Pump</SelectItem>
                    <SelectItem value="drop">Drop</SelectItem>
                    <SelectItem value="tablet">Tablet</SelectItem>
                    <SelectItem value="packet">Packet</SelectItem>
                    <SelectItem value="g">Grams (g)</SelectItem>
                    <SelectItem value="lozenge">Lozenge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label className="text-sm font-semibold">Units Per Bottle</Label><Input type="number" value={editData.units_per_bottle} onChange={(e) => setEditData({...editData, units_per_bottle: e.target.value})} className="h-12 font-mono" /></div>
              <div className="space-y-2"><Label className="text-sm font-semibold">Cost Per Bottle ($)</Label><Input type="number" step="0.01" value={editData.cost_per_bottle} onChange={(e) => setEditData({...editData, cost_per_bottle: e.target.value})} className="h-12 font-mono" /></div>
              <div className="space-y-2"><Label className="text-sm font-semibold">Default Qty Per Dose</Label><Input type="number" value={editData.default_quantity_per_dose} onChange={(e) => setEditData({...editData, default_quantity_per_dose: e.target.value})} className="h-12 font-mono" /></div>
              <div className="space-y-2"><Label className="text-sm font-semibold">Default Freq Per Day</Label><Input type="number" value={editData.default_frequency_per_day} onChange={(e) => setEditData({...editData, default_frequency_per_day: e.target.value})} className="h-12 font-mono" /></div>
              <div className="space-y-2 col-span-2"><Label className="text-sm font-semibold">Default Dosage Display</Label><Input value={editData.default_dosage_display} onChange={(e) => setEditData({...editData, default_dosage_display: e.target.value})} className="h-12" placeholder="e.g., 2 caps 3x/day" /></div>
              <div className="space-y-2 col-span-2"><Label className="text-sm font-semibold">Default Instructions</Label><Input value={editData.default_instructions} onChange={(e) => setEditData({...editData, default_instructions: e.target.value})} className="h-12" placeholder="e.g., With food" /></div>
              <div className="space-y-2"><Label className="text-sm font-semibold">Bottles Per Month</Label><Input type="number" step="0.01" value={editData.bottles_per_month} onChange={(e) => setEditData({...editData, bottles_per_month: e.target.value})} className="h-12 font-mono" placeholder="Override" /></div>
              <div className="space-y-2 col-span-2"><Label className="text-sm font-semibold">Notes</Label><Input value={editData.notes} onChange={(e) => setEditData({...editData, notes: e.target.value})} className="h-12" /></div>
              <div className="flex items-center gap-4 py-1"><Switch checked={editData.refrigerate} onCheckedChange={(v) => setEditData({...editData, refrigerate: v})} /><Label className="text-sm font-medium">Requires Refrigeration</Label></div>
              <div className="flex items-center gap-4 py-1"><Switch checked={editData.active} onCheckedChange={(v) => setEditData({...editData, active: v})} /><Label className="text-sm font-medium">Active</Label></div>
            </div>
          </div>
          <DialogFooter className="gap-3 mt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="h-11 px-5">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="h-11 px-6 bg-[#0B0D10] hover:bg-[#1a1d21] text-white font-semibold">{saving ? 'Saving...' : (editId ? 'Update' : 'Add')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="p-7">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Delete this supplement?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm mt-2">This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel className="h-10 px-5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-[#C53030] text-white hover:bg-[#9B2C2C] h-10 px-5 font-semibold">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
