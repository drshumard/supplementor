import React, { useState, useEffect, useCallback } from 'react';
import { getSuppliers, updateSupplier } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '../components/ui/dialog';
import { Pencil, Truck } from 'lucide-react';
import { toast } from 'sonner';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({ freight_charge: '', notes: '' });
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const res = await getSuppliers(); setSuppliers(res.suppliers || []); }
    catch (err) { toast.error('Failed to load suppliers'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openEdit = (s) => {
    setEditId(s._id);
    setEditName(s.name);
    setEditData({ freight_charge: s.freight_charge ?? '', notes: s.notes || '' });
    setEditOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSupplier(editId, {
        freight_charge: editData.freight_charge ? parseFloat(editData.freight_charge) : 0,
        notes: editData.notes,
      });
      toast.success('Supplier updated');
      setEditOpen(false); fetchData();
    } catch (err) { toast.error(err.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-10 max-w-[1560px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#0B0D10]">Suppliers</h1>
        <p className="text-sm text-muted-foreground mt-1">5 suppliers — manage freight/shipping charges per supplier. Charged once per month when any supplement from this supplier is in a plan.</p>
      </div>

      <div className="rounded-xl border border-[#E2E8F0] bg-white card-elevated overflow-hidden" data-testid="admin-suppliers-table">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#0D5F68] hover:bg-[#0D5F68] rounded-t-xl">
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-3.5 px-6">Supplier</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-3.5 w-[160px]">Freight Charge</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-3.5">Notes</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-3.5 w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="h-40 text-center text-muted-foreground">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-[#0D5F68] border-t-transparent rounded-full animate-spin" /> Loading...
                </div>
              </TableCell></TableRow>
            ) : (
              suppliers.map(s => (
                <TableRow key={s._id} className="hover:bg-[#F0FAFA] transition-colors duration-150">
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
                  <TableCell className="text-sm text-[#718096] py-5">{s.notes || '-'}</TableCell>
                  <TableCell className="py-5">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-[#EAF4F3] text-[#94A3B8] hover:text-[#0D5F68]"
                      onClick={() => openEdit(s)}><Pencil size={14} /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[400px] p-7">
          <DialogHeader>
            <DialogTitle className="text-lg">Edit {editName}</DialogTitle>
            <DialogDescription className="text-sm mt-1">Update freight charge for this supplier.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
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
              {saving ? 'Saving...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
