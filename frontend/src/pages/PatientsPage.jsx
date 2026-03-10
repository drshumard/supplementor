import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPatients, createPatient, deletePatient } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
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
import { Plus, Search, Trash2, ChevronRight, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', email: '', phone: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPatients(search);
      setPatients(res.patients || []);
      setTotal(res.total || 0);
    } catch (err) { toast.error('Failed to load patients'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!newPatient.name.trim()) { toast.error('Patient name is required'); return; }
    setSaving(true);
    try {
      const result = await createPatient(newPatient);
      toast.success('Patient added');
      setAddOpen(false);
      setNewPatient({ name: '', email: '', phone: '', notes: '' });
      navigate(`/patients/${result._id}`);
    } catch (err) { toast.error(err.message || 'Failed to add patient'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deletePatient(deleteId); toast.success('Patient deleted'); fetchData(); }
    catch (err) { toast.error(err.message || 'Delete failed'); }
    finally { setDeleteId(null); }
  };

  return (
    <div className="p-10 max-w-[1560px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#0B0D10]">Patients</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} patient{total !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setAddOpen(true)} data-testid="add-patient-button"
          className="gap-2.5 h-12 px-7 bg-[#0D5F68] hover:bg-[#0A4E55] text-white font-bold shadow-sm text-sm">
          <UserPlus size={18} /> Add Patient
        </Button>
      </div>

      <div className="relative max-w-[400px] mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search patients..." value={search} onChange={(e) => setSearch(e.target.value)}
          data-testid="patients-search" className="pl-11 h-12" />
      </div>

      <div className="rounded-xl border border-[#E2E8F0] bg-white card-elevated overflow-hidden" data-testid="patients-table">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-[#0D5F68] rounded-t-xl">
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-4 px-6">Name</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-4">Email</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-4">Phone</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-4 w-[100px]">Plans</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-4 w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-[#0D5F68] border-t-transparent rounded-full animate-spin" /> Loading...
                </div>
              </TableCell></TableRow>
            ) : patients.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-40 text-center">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <UserPlus size={40} strokeWidth={1} />
                  <p className="text-base">No patients yet</p>
                  <Button onClick={() => setAddOpen(true)} className="mt-2 h-11 px-5 bg-[#0D5F68] hover:bg-[#0A4E55] text-white font-semibold">Add your first patient</Button>
                </div>
              </TableCell></TableRow>
            ) : (
              patients.map(p => (
                <TableRow key={p._id} className="cursor-pointer hover:bg-[#F0FAFA] transition-colors" onClick={() => navigate(`/patients/${p._id}`)}>
                  <TableCell className="py-5 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#EAF4F3] flex items-center justify-center text-sm font-bold text-[#0D5F68]">
                        {p.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="font-bold text-sm text-[#0B0D10]">{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground py-5">{p.email || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground py-5">{p.phone || '-'}</TableCell>
                  <TableCell className="py-5">
                    <Badge className="bg-[#EAF4F3] text-[#0D5F68] hover:bg-[#EAF4F3] px-3 py-1 text-xs font-bold">{p.plan_count || 0}</Badge>
                  </TableCell>
                  <TableCell className="py-5">
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg text-muted-foreground hover:text-[#C53B3B] hover:bg-red-50"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(p._id); }}><Trash2 size={15} /></Button>
                      <ChevronRight size={16} className="text-muted-foreground" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Patient Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-[480px] p-7">
          <DialogHeader>
            <DialogTitle className="text-lg">Add Patient</DialogTitle>
            <DialogDescription className="text-sm mt-1">Add a new patient to create plans for.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Full Name *</Label>
              <Input value={newPatient.name} onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
                className="h-12" placeholder="e.g. John Smith" data-testid="patient-form-name" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Email</Label>
              <Input type="email" value={newPatient.email} onChange={(e) => setNewPatient({...newPatient, email: e.target.value})}
                className="h-12" placeholder="patient@email.com" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Phone</Label>
              <Input value={newPatient.phone} onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})}
                className="h-12" placeholder="(555) 123-4567" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Notes</Label>
              <Input value={newPatient.notes} onChange={(e) => setNewPatient({...newPatient, notes: e.target.value})}
                className="h-12" placeholder="Any relevant notes" />
            </div>
          </div>
          <DialogFooter className="gap-3 mt-2">
            <Button variant="outline" onClick={() => setAddOpen(false)} className="h-11 px-5">Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}
              className="h-11 px-6 bg-[#0D5F68] hover:bg-[#0A4E55] text-white font-semibold" data-testid="patient-form-submit">
              {saving ? 'Adding...' : 'Add Patient'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="p-7">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Delete this patient?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm mt-2">This will also delete all their plans. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel className="h-10 px-5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-[#C53B3B] text-white hover:bg-[#A52E2E] h-10 px-5 font-semibold">Delete Patient</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
