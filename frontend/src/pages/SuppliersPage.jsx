import React, { useState, useEffect, useCallback } from 'react';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
import { Plus, Pencil, Trash2, Truck } from 'lucide-react';
import { toast } from 'sonner';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({ name: '', freight_charge: '', notes: '' });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const res = await getSuppliers(); setSuppliers(res.suppliers || []); }
    catch (err) { toast.error('Failed to load suppliers'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => { setEditId(null); setEditData({ name: '', freight_charge: '', notes: '' }); setEditOpen(true); };
  const openEdit = (s) => {
    setEditId(s._id);
    setEditData({ name: s.name, freight_charge: s.freight_charge ?? '', notes: s.notes || '' });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editData.name.trim()) { toast.error('Supplier name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: editData.name.trim(),
        freight_charge: editData.freight_charge ? parseFloat(editData.freight_charge) : 0,
        notes: editData.notes,
      };
      if (editId) { await updateSupplier(editId, payload); toast.success('Supplier updated'); }
      else { await createSupplier(payload); toast.success('Supplier added'); }
      setEditOpen(false); fetchData();
    } catch (err) { toast.error(err.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteSupplier(deleteId); toast.success('Supplier deleted'); fetchData(); }
    catch (err) { toast.error(err.message || 'Delete failed'); }
    finally { setDeleteId(null); }
  };

  return (
    <div className="p-10 max-w-[1560px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#0B0D10]">Suppliers</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage suppliers and freight charges. Freight is charged once per supplier per month.</p>
        </div>
        <Button onClick={openAdd} className="gap-2.5 h-12 px-7 bg-[#0B0D10] hover:bg-[#1a1d21] text-white font-bold shadow-sm text-sm"
          data-testid="admin-suppliers-add-button">
          <Plus size={18} /> Add Supplier
        </Button>
      </div>

      <div className="rounded-xl border border-[#E2E8F0] bg-white card-elevated overflow-hidden" data-testid="admin-suppliers-table">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#0D5F68] hover:bg-[#0D5F68] rounded-t-xl">
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-3.5 px-6">Supplier</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-3.5 w-[160px]">Freight Charge</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-3.5 w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={2} className="h-40 text-center text-muted-foreground">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-[#0D5F68] border-t-transparent rounded-full animate-spin" /> Loading...
                </div>
              </TableCell></TableRow>
            ) : suppliers.length === 0 ? (
              <TableRow><TableCell colSpan={2} className="h-40 text-center text-muted-foreground">
                <Truck size={36} strokeWidth={1} className="mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm">No suppliers yet</p>
              </TableCell></TableRow>
            ) : (
              suppliers.map(s => (
                <TableRow key={s._id} className="hover:bg-[#F0FAFA] cursor-pointer transition-colors duration-150" onClick={() => openEdit(s)}>
                  <TableCell className="py-5 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#EAF4F3] flex items-center justify-center">
                        <Truck size={16} className="text-[#0D5F68]" />
                      </div>
                      <span className="font-semibold text-sm text-[#0B0D10]">{s.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-5">
                    <span className="font-mono tabular-nums text-base font-bold text-[#147D5A]">
                      ${(s.freight_charge || 0).toFixed(2)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[400px] p-7">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg">{editId ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
              {editId && (
                <Button variant="ghost" size="sm" onClick={() => { setEditOpen(false); setDeleteId(editId); }}
                  className="h-8 px-3 text-xs text-[#C53B3B] hover:bg-red-50 hover:text-[#A52E2E] gap-1.5">
                  <Trash2 size={13} /> Delete
                </Button>
              )}
            </div>
            <DialogDescription className="text-sm mt-1">
              {editId ? 'Update supplier details.' : 'Add a new supplier with freight charge.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Supplier Name *</Label>
              <Input value={editData.name} onChange={(e) => setEditData({...editData, name: e.target.value})}
                className="h-12" placeholder="e.g. Emerson" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Freight Charge ($)</Label>
              <Input type="number" step="0.01" value={editData.freight_charge}
                onChange={(e) => setEditData({...editData, freight_charge: e.target.value})}
                className="h-12 font-mono text-lg" placeholder="0.00" />
              <p className="text-xs text-muted-foreground">Charged once per month when any supplement from this supplier is in a plan.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Notes</Label>
              <Input value={editData.notes} onChange={(e) => setEditData({...editData, notes: e.target.value})}
                className="h-12" placeholder="Optional" />
            </div>
          </div>
          <DialogFooter className="gap-3 mt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="h-11 px-5">Cancel</Button>
            <Button onClick={handleSave} disabled={saving}
              className="h-11 px-6 bg-[#0D5F68] hover:bg-[#0A4E55] text-white font-semibold">
              {saving ? 'Saving...' : (editId ? 'Update' : 'Add Supplier')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="p-7">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Delete this supplier?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm mt-2">Supplements using this supplier will keep the name but won't have freight applied.</AlertDialogDescription>
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
