import React, { useState, useEffect, useCallback } from 'react';
import { getSupplements, createSupplement, updateSupplement, deleteSupplement, getSuppliers } from '../lib/api';
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
import { Plus, Search, Snowflake, Pill, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const emptySupp = {
  supplement_name: '', company: '', supplier: '', units_per_bottle: '', unit_type: 'caps',
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
  const [supplierList, setSupplierList] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [suppRes, compRes] = await Promise.all([getSupplements(search, false), getSuppliers()]);
      setSupplements(suppRes.supplements || []); setTotal(suppRes.total || 0);
      setSupplierList(compRes.suppliers || []);
    } catch (err) { toast.error('Failed to load supplements'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => { setEditId(null); setEditData({ ...emptySupp }); setEditOpen(true); };
  const openEdit = (supp) => {
    setEditId(supp._id);
    setEditData({
      supplement_name: supp.supplement_name || '', company: supp.company || supp.manufacturer || '',
      supplier: supp.supplier || '',
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
        supplier: editData.supplier === 'none' ? '' : editData.supplier,
        manufacturer: editData.company,
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
    try { await deleteSupplement(deleteId); toast.success('Deleted'); setEditOpen(false); fetchData(); }
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

      <div className="flex items-center gap-5 mb-6">
        <div className="rounded-xl bg-[#EAF4F3] border border-[#C8E6E0] px-5 py-3 flex items-center gap-3">
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
            <TableRow className="bg-[#0D5F68] hover:bg-[#0D5F68] rounded-t-xl">
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-3.5 px-6 w-[30%]">Name</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-3.5 w-[15%]">Brand</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-3.5 w-[12%]">Size</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-3.5 w-[22%]">Dosage</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-3.5 w-[10%] text-center">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                <div className="flex items-center justify-center gap-3"><div className="w-5 h-5 border-2 border-[#0D5F68] border-t-transparent rounded-full animate-spin" /> Loading...</div>
              </TableCell></TableRow>
            ) : supplements.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-40 text-center text-muted-foreground text-base">No supplements found</TableCell></TableRow>
            ) : (
              supplements.map(supp => (
                <TableRow key={supp._id} className="hover:bg-[#F0FAFA] cursor-pointer transition-colors duration-150" onClick={() => openEdit(supp)}>
                  <TableCell className="py-4 px-6">
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-sm text-[#0B0D10]">{supp.supplement_name}</span>
                      {supp.refrigerate && <Snowflake size={13} className="text-blue-500" />}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-[#718096] py-4">{supp.company || supp.manufacturer}</TableCell>
                  <TableCell className="font-mono tabular-nums text-sm py-4">{supp.units_per_bottle || '-'} {supp.unit_type}</TableCell>
                  <TableCell className="text-sm py-4">{supp.default_dosage_display || '-'}</TableCell>
                  <TableCell className="text-center font-mono tabular-nums text-sm font-bold text-[#147D5A] py-4 w-[10%]">{formatCurrency(supp.cost_per_bottle)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit/Add Dialog — compact layout */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[640px] p-6">
          <DialogHeader className="pb-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold">{editId ? editData.supplement_name || 'Edit Supplement' : 'Add Supplement'}</DialogTitle>
              {editId && (
                <Button variant="ghost" size="sm" onClick={() => setDeleteId(editId)}
                  className="h-8 px-3 text-xs text-[#C53B3B] hover:bg-red-50 hover:text-[#A52E2E] gap-1.5">
                  <Trash2 size={13} /> Delete
                </Button>
              )}
            </div>
            <DialogDescription className="text-xs">Fill in supplement details.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-x-4 gap-y-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-semibold">Name *</Label>
              <Input value={editData.supplement_name} onChange={(e) => setEditData({...editData, supplement_name: e.target.value})} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Unit Type</Label>
              <Select value={editData.unit_type} onValueChange={(v) => setEditData({...editData, unit_type: v})}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="caps">Capsules</SelectItem>
                  <SelectItem value="ml">ml</SelectItem>
                  <SelectItem value="serving">Serving</SelectItem>
                  <SelectItem value="scoop">Scoop</SelectItem>
                  <SelectItem value="pump">Pump</SelectItem>
                  <SelectItem value="drop">Drop</SelectItem>
                  <SelectItem value="tablet">Tablet</SelectItem>
                  <SelectItem value="packet">Packet</SelectItem>
                  <SelectItem value="g">Grams</SelectItem>
                  <SelectItem value="lozenge">Lozenge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Manufacturer</Label>
              <Input value={editData.company} onChange={(e) => setEditData({...editData, company: e.target.value})} className="h-9 text-sm" placeholder="e.g. Quicksilver" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Supplier</Label>
              <Select value={editData.supplier || 'none'} onValueChange={(v) => setEditData({...editData, supplier: v})}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No supplier</SelectItem>
                  {supplierList.map(s => <SelectItem key={s._id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Units/Bottle</Label>
              <Input type="number" value={editData.units_per_bottle} onChange={(e) => setEditData({...editData, units_per_bottle: e.target.value})} className="h-9 text-sm font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Cost/Bottle ($)</Label>
              <Input type="number" step="0.01" value={editData.cost_per_bottle} onChange={(e) => setEditData({...editData, cost_per_bottle: e.target.value})} className="h-9 text-sm font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Default Qty/Dose</Label>
              <Input type="number" value={editData.default_quantity_per_dose} onChange={(e) => setEditData({...editData, default_quantity_per_dose: e.target.value})} className="h-9 text-sm font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Default Freq/Day</Label>
              <Input type="number" value={editData.default_frequency_per_day} onChange={(e) => setEditData({...editData, default_frequency_per_day: e.target.value})} className="h-9 text-sm font-mono" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-semibold">Default Dosage Display</Label>
              <Input value={editData.default_dosage_display} onChange={(e) => setEditData({...editData, default_dosage_display: e.target.value})} className="h-9 text-sm" placeholder="e.g. 2 caps 3x/day" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Btls/Month</Label>
              <Input type="number" step="0.01" value={editData.bottles_per_month} onChange={(e) => setEditData({...editData, bottles_per_month: e.target.value})} className="h-9 text-sm font-mono" placeholder="Override" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-semibold">Default Instructions</Label>
              <Input value={editData.default_instructions} onChange={(e) => setEditData({...editData, default_instructions: e.target.value})} className="h-9 text-sm" placeholder="e.g. With food" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Notes</Label>
              <Input value={editData.notes} onChange={(e) => setEditData({...editData, notes: e.target.value})} className="h-9 text-sm" />
            </div>
            <div className="flex items-center gap-3 pt-2"><Switch checked={editData.refrigerate} onCheckedChange={(v) => setEditData({...editData, refrigerate: v})} /><Label className="text-xs font-medium">Refrigerate</Label></div>
            <div className="flex items-center gap-3 pt-2"><Switch checked={editData.active} onCheckedChange={(v) => setEditData({...editData, active: v})} /><Label className="text-xs font-medium">Active</Label></div>
          </div>
          <DialogFooter className="gap-3 mt-4 pt-3 border-t">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="h-9 px-4 text-sm">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="h-9 px-5 bg-[#0D5F68] hover:bg-[#0A4E55] text-white font-semibold text-sm">{saving ? 'Saving...' : (editId ? 'Update' : 'Add')}</Button>
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
            <AlertDialogAction onClick={handleDelete} className="bg-[#C53B3B] text-white hover:bg-[#A52E2E] h-10 px-5 font-semibold">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
