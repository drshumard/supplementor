import React, { useState, useEffect, useCallback } from 'react';
import { getSupplements, createSupplement, updateSupplement, deleteSupplement } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
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
import { Plus, Search, Pencil, Trash2, Snowflake } from 'lucide-react';
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
    try {
      const res = await getSupplements(search, false);
      setSupplements(res.supplements || []);
      setTotal(res.total || 0);
    } catch (err) {
      toast.error('Failed to load supplements');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    setEditId(null);
    setEditData({ ...emptySupp });
    setEditOpen(true);
  };

  const openEdit = (supp) => {
    setEditId(supp._id);
    setEditData({
      supplement_name: supp.supplement_name || '',
      company: supp.company || '',
      units_per_bottle: supp.units_per_bottle ?? '',
      unit_type: supp.unit_type || 'caps',
      default_quantity_per_dose: supp.default_quantity_per_dose ?? '',
      default_frequency_per_day: supp.default_frequency_per_day ?? '',
      default_dosage_display: supp.default_dosage_display || '',
      cost_per_bottle: supp.cost_per_bottle ?? '',
      default_instructions: supp.default_instructions || '',
      refrigerate: supp.refrigerate || false,
      notes: supp.notes || '',
      bottles_per_month: supp.bottles_per_month ?? '',
      active: supp.active !== false,
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editData.supplement_name.trim()) {
      toast.error('Supplement name is required');
      return;
    }
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
      if (editId) {
        await updateSupplement(editId, payload);
        toast.success('Supplement updated');
      } else {
        await createSupplement(payload);
        toast.success('Supplement added');
      }
      setEditOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteSupplement(deleteId);
      toast.success('Supplement deleted');
      fetchData();
    } catch (err) {
      toast.error('Delete failed');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="p-8 max-w-[1560px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.01em] text-[#0B0D10]">Master Supplement List</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} supplement{total !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openAdd} className="gap-2" data-testid="admin-supplements-add-button">
          <Plus size={16} /> Add Supplement
        </Button>
      </div>

      <div className="relative max-w-[320px] mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search supplements..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="admin-supplements-search-input"
          className="pl-9 h-9"
        />
      </div>

      <div className="rounded-xl border bg-card shadow-[var(--shadow-sm)]" data-testid="admin-supplements-table">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground">Name</TableHead>
              <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground">Brand</TableHead>
              <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground text-center">Size</TableHead>
              <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground">Default Dosage</TableHead>
              <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground text-right">Price</TableHead>
              <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground text-center">Bottles/Mo</TableHead>
              <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground text-center">Status</TableHead>
              <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[hsl(187,79%,23%)] border-t-transparent rounded-full animate-spin" />
                  Loading...
                </div>
              </TableCell></TableRow>
            ) : supplements.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground text-sm">No supplements found</TableCell></TableRow>
            ) : (
              supplements.map(supp => (
                <TableRow key={supp._id} className="hover:bg-[var(--table-zebra)]">
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-[#0B0D10]">{supp.supplement_name}</span>
                      {supp.refrigerate && <Snowflake size={12} className="text-blue-500" />}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{supp.company}</TableCell>
                  <TableCell className="text-center font-mono tabular-nums text-sm">
                    {supp.units_per_bottle || '-'} {supp.unit_type}
                  </TableCell>
                  <TableCell className="text-sm">{supp.default_dosage_display || '-'}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-sm font-medium text-[#147D5A]">
                    {formatCurrency(supp.cost_per_bottle)}
                  </TableCell>
                  <TableCell className="text-center font-mono tabular-nums text-sm">
                    {supp.bottles_per_month ?? '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={supp.active !== false ? 'default' : 'secondary'}
                      className={supp.active !== false ? 'bg-[hsl(147,70%,30%)] text-white text-[10px]' : 'text-[10px]'}>
                      {supp.active !== false ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(supp)}>
                        <Pencil size={13} />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(supp._id)}>
                        <Trash2 size={13} />
                      </Button>
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
        <DialogContent className="max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Supplement' : 'Add Supplement'}</DialogTitle>
            <DialogDescription>Fill in the supplement details below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label className="text-sm">Supplement Name *</Label>
                <Input value={editData.supplement_name} onChange={(e) => setEditData({...editData, supplement_name: e.target.value})} className="h-9" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Company / Brand</Label>
                <Input value={editData.company} onChange={(e) => setEditData({...editData, company: e.target.value})} className="h-9" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Unit Type</Label>
                <Input value={editData.unit_type} onChange={(e) => setEditData({...editData, unit_type: e.target.value})} className="h-9" placeholder="caps, ml, scoops" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Units Per Bottle</Label>
                <Input type="number" value={editData.units_per_bottle} onChange={(e) => setEditData({...editData, units_per_bottle: e.target.value})} className="h-9 font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Cost Per Bottle ($)</Label>
                <Input type="number" step="0.01" value={editData.cost_per_bottle} onChange={(e) => setEditData({...editData, cost_per_bottle: e.target.value})} className="h-9 font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Default Qty Per Dose</Label>
                <Input type="number" value={editData.default_quantity_per_dose} onChange={(e) => setEditData({...editData, default_quantity_per_dose: e.target.value})} className="h-9 font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Default Freq Per Day</Label>
                <Input type="number" value={editData.default_frequency_per_day} onChange={(e) => setEditData({...editData, default_frequency_per_day: e.target.value})} className="h-9 font-mono" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="text-sm">Default Dosage Display</Label>
                <Input value={editData.default_dosage_display} onChange={(e) => setEditData({...editData, default_dosage_display: e.target.value})} className="h-9" placeholder="e.g., 2 caps 3x/day" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="text-sm">Default Instructions</Label>
                <Input value={editData.default_instructions} onChange={(e) => setEditData({...editData, default_instructions: e.target.value})} className="h-9" placeholder="e.g., With food" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Bottles Per Month (Manual)</Label>
                <Input type="number" step="0.01" value={editData.bottles_per_month} onChange={(e) => setEditData({...editData, bottles_per_month: e.target.value})} className="h-9 font-mono" placeholder="Override calc" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="text-sm">Notes</Label>
                <Input value={editData.notes} onChange={(e) => setEditData({...editData, notes: e.target.value})} className="h-9" />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={editData.refrigerate} onCheckedChange={(v) => setEditData({...editData, refrigerate: v})} />
                <Label className="text-sm">Requires Refrigeration</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={editData.active} onCheckedChange={(v) => setEditData({...editData, active: v})} />
                <Label className="text-sm">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : (editId ? 'Update' : 'Add')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this supplement?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
