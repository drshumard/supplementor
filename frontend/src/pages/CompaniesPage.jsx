import React, { useState, useEffect, useCallback } from 'react';
import { getCompanies, createCompany, updateCompany, deleteCompany } from '../lib/api';
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
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const emptyCompany = { name: '', freight_charge: '', notes: '' };

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState(emptyCompany);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const res = await getCompanies(); setCompanies(res.companies || []); }
    catch (err) { toast.error('Failed to load companies'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => { setEditId(null); setEditData({ ...emptyCompany }); setEditOpen(true); };
  const openEdit = (c) => {
    setEditId(c._id);
    setEditData({ name: c.name || '', freight_charge: c.freight_charge ?? '', notes: c.notes || '' });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editData.name.trim()) { toast.error('Company name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: editData.name.trim(),
        freight_charge: editData.freight_charge ? parseFloat(editData.freight_charge) : 0,
        notes: editData.notes,
      };
      if (editId) { await updateCompany(editId, payload); toast.success('Company updated'); }
      else { await createCompany(payload); toast.success('Company added'); }
      setEditOpen(false); fetchData();
    } catch (err) { toast.error(err.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteCompany(deleteId); toast.success('Company deleted'); fetchData(); }
    catch (err) { toast.error(err.message || 'Delete failed'); }
    finally { setDeleteId(null); }
  };

  return (
    <div className="p-10 max-w-[1560px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#0B0D10]">Companies / Brands</h1>
          <p className="text-sm text-muted-foreground mt-1">{companies.length} compan{companies.length !== 1 ? 'ies' : 'y'} — manage freight charges here</p>
        </div>
        <Button onClick={openAdd} className="gap-2.5 h-12 px-7 bg-[#0B0D10] hover:bg-[#1a1d21] text-white font-bold shadow-sm text-sm"
          data-testid="admin-companies-add-button">
          <Plus size={18} /> Add Company
        </Button>
      </div>

      <div className="rounded-xl border border-[#E2E8F0] bg-white card-elevated overflow-hidden" data-testid="admin-companies-table">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#0D5F68] hover:bg-[#0D5F68] rounded-t-xl">
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-3.5 px-6">Company / Brand</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-3.5 w-[160px]">Freight Charge</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-3.5">Notes</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-3.5 w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="h-40 text-center text-muted-foreground">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-[#0D5F68] border-t-transparent rounded-full animate-spin" /> Loading...
                </div>
              </TableCell></TableRow>
            ) : companies.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-40 text-center text-muted-foreground">
                <Building2 size={36} strokeWidth={1} className="mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm">No companies yet</p>
              </TableCell></TableRow>
            ) : (
              companies.map(c => (
                <TableRow key={c._id} className="hover:bg-[#F0FAFA] transition-colors duration-150">
                  <TableCell className="font-semibold text-sm text-[#0B0D10] py-4 px-6">{c.name}</TableCell>
                  <TableCell className="py-4">
                    <span className={`font-mono tabular-nums text-sm font-semibold ${c.freight_charge > 0 ? 'text-[#147D5A]' : 'text-[#94A3B8]'}`}>
                      ${(c.freight_charge || 0).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-[#718096] py-4">{c.notes || '-'}</TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-[#EAF4F3] text-[#94A3B8] hover:text-[#0D5F68]"
                        onClick={() => openEdit(c)}><Pencil size={14} /></Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-[#94A3B8] hover:text-[#C53B3B] hover:bg-red-50"
                        onClick={() => setDeleteId(c._id)}><Trash2 size={14} /></Button>
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
        <DialogContent className="max-w-[440px] p-7">
          <DialogHeader>
            <DialogTitle className="text-lg">{editId ? 'Edit Company' : 'Add Company'}</DialogTitle>
            <DialogDescription className="text-sm mt-1">
              {editId ? 'Update company details and freight charge.' : 'Add a new company/brand. Freight is charged once per company per month.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Company / Brand Name *</Label>
              <Input value={editData.name} onChange={(e) => setEditData({...editData, name: e.target.value})}
                className="h-12" placeholder="e.g. Cellcore" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Freight Charge ($)</Label>
              <Input type="number" step="0.01" value={editData.freight_charge}
                onChange={(e) => setEditData({...editData, freight_charge: e.target.value})}
                className="h-12 font-mono" placeholder="0.00" />
              <p className="text-xs text-muted-foreground">Charged once per month when any supplement from this company is in a plan.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Notes</Label>
              <Input value={editData.notes} onChange={(e) => setEditData({...editData, notes: e.target.value})}
                className="h-12" placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter className="gap-3 mt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="h-11 px-5">Cancel</Button>
            <Button onClick={handleSave} disabled={saving}
              className="h-11 px-6 bg-[#0D5F68] hover:bg-[#0A4E55] text-white font-semibold">
              {saving ? 'Saving...' : (editId ? 'Update' : 'Add Company')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="p-7">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Delete this company?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm mt-2">This won't delete supplements — they'll keep the company name as text.</AlertDialogDescription>
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
