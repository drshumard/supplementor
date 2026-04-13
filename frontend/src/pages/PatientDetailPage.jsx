import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatient, updatePatient, deletePlan, duplicatePlan, saveAllPlansToDrive } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { ArrowLeft, Plus, Trash2, Copy, FileText, Pencil, Save, X } from 'lucide-react';
import { toast } from 'sonner';

export default function PatientDetailPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [savingDrive, setSavingDrive] = useState(false);

  const handleSaveAllToDrive = async () => {
    setSavingDrive(true);
    try {
      const result = await saveAllPlansToDrive(patientId);
      toast.success(result.message);
    } catch (err) { toast.error(err.message || 'Drive save failed'); }
    finally { setSavingDrive(false); }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPatient(patientId);
      setPatient(res);
      setEditData({ name: res.name || '', email: res.email || '', phone: res.phone || '', notes: res.notes || '' });
    } catch (err) { toast.error('Failed to load patient'); navigate('/patients'); }
    finally { setLoading(false); }
  }, [patientId, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePatient(patientId, editData);
      toast.success('Patient updated');
      setEditing(false);
      fetchData();
    } catch (err) { toast.error('Update failed'); }
    finally { setSaving(false); }
  };

  const handleDeletePlan = async () => {
    if (!deleteId) return;
    try { await deletePlan(deleteId); toast.success('Plan deleted'); fetchData(); }
    catch (err) { toast.error('Delete failed'); }
    finally { setDeleteId(null); }
  };

  const handleDuplicate = async (e, planId) => {
    e.stopPropagation();
    try { const r = await duplicatePlan(planId); toast.success('Plan duplicated'); navigate(`/plans/${r._id}`); }
    catch (err) { toast.error('Duplicate failed'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-[#0D5F68] border-t-transparent rounded-full animate-spin" /></div>;
  if (!patient) return null;

  const plans = patient.plans || [];

  return (
    <div className="p-10 max-w-[1560px] mx-auto">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/patients')} className="gap-2 text-muted-foreground hover:text-[#0B0D10] mb-6 h-10 px-3">
        <ArrowLeft size={18} /> Back to Patients
      </Button>

      {/* Patient Info Card */}
      <div className="rounded-2xl border border-border/40 bg-[#FAFAFA] shadow-sm mb-8 overflow-hidden">
        <div className="flex items-center justify-between px-8 py-5 border-b-2 border-[#E2E8F0] border-b border-[#C8E6E0]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-xl font-bold text-[#0D5F68] border border-[#C8E6E0]">
              {patient.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0B0D10]">{patient.name}</h1>
              <p className="text-sm text-[#61746E]">
                {patient.email && `${patient.email}`}{patient.phone && ` · ${patient.phone}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-2 h-10 px-4 text-sm font-semibold">
                <Pencil size={14} /> Edit
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="gap-2 h-10 px-4 text-sm"><X size={14} /> Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2 h-10 px-4 text-sm font-semibold bg-[#0D5F68] hover:bg-[#0A4E55] text-white">
                  <Save size={14} /> {saving ? 'Saving...' : 'Save'}
                </Button>
              </>
            )}
          </div>
        </div>
        {editing && (
          <div className="px-8 py-6 grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Name</Label>
              <Input value={editData.name} onChange={(e) => setEditData({...editData, name: e.target.value})} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Email</Label>
              <Input value={editData.email} onChange={(e) => setEditData({...editData, email: e.target.value})} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Phone</Label>
              <Input value={editData.phone} onChange={(e) => setEditData({...editData, phone: e.target.value})} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Notes</Label>
              <Input value={editData.notes} onChange={(e) => setEditData({...editData, notes: e.target.value})} className="h-11" />
            </div>
          </div>
        )}
        {!editing && patient.notes && (
          <div className="px-8 py-4 text-sm text-muted-foreground">{patient.notes}</div>
        )}
      </div>

      {/* Plans Section */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-[#0B0D10]">Plans ({plans.length})</h2>
        <div className="flex items-center gap-3">
          {plans.length > 0 && (
            <Button variant="outline" onClick={handleSaveAllToDrive} disabled={savingDrive}
              className="gap-2 h-11 px-5 text-sm font-semibold" data-testid="save-all-drive">
              <svg width="16" height="16" viewBox="0 0 256 218" xmlns="http://www.w3.org/2000/svg" className="shrink-0"><path d="M63.5 0L0 107l63.5 109h129L256 107 192.5 0h-129z" fill="#0061FF" transform="scale(0.98) translate(3,0)"/></svg>
              {savingDrive ? 'Saving...' : 'Save All to Dropbox'}
            </Button>
          )}
          <Button onClick={() => navigate(`/plans/new?patient_id=${patientId}&patient_name=${encodeURIComponent(patient.name)}`)}
            className="gap-2 h-11 px-6 bg-[#0D5F68] hover:bg-[#0A4E55] text-white font-semibold text-sm" data-testid="new-plan-for-patient">
            <Plus size={16} /> New Plan
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-[#E2E8F0] bg-white card-elevated overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#0D5F68] hover:bg-[#0D5F68] rounded-t-xl">
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-4 px-6">Program</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-4">Step</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-4">Months</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-4">Total Cost</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-4">Status</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-4">Last Updated</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-4 w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                <FileText size={36} strokeWidth={1} className="mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm">No plans yet for this patient</p>
              </TableCell></TableRow>
            ) : (
              plans.map(plan => (
                <TableRow key={plan._id} className="cursor-pointer hover:bg-[#F0FAFA] transition-colors" onClick={() => navigate(`/plans/${plan._id}`)}>
                  <TableCell className="font-bold text-sm text-[#0B0D10] py-5 px-6">{plan.program_name}</TableCell>
                  <TableCell className="text-sm py-5">{plan.step_label || `Step ${plan.step_number}`}</TableCell>
                  <TableCell className="text-sm font-mono py-5">{plan.months?.length || 0}</TableCell>
                  <TableCell className="text-sm font-mono font-bold text-[#147D5A] py-5">{formatCurrency(plan.total_program_cost)}</TableCell>
                  <TableCell className="py-5">
                    <Badge className={`px-3 py-1.5 text-[10px] font-bold ${
                      plan.status === 'finalized' ? 'bg-[#147D5A] text-white hover:bg-[#147D5A]' : 'bg-[#EEF1F1] text-[#61746E] hover:bg-[#EEF1F1]'
                    }`}>{plan.status || 'draft'}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground py-5">
                    {plan.updated_at ? new Date(plan.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                  </TableCell>
                  <TableCell className="py-5">
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg hover:bg-[#E0F2F1] text-muted-foreground hover:text-[#0D5F68]"
                        onClick={(e) => handleDuplicate(e, plan._id)}><Copy size={15} /></Button>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg text-muted-foreground hover:text-[#C53B3B] hover:bg-red-50"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(plan._id); }}><Trash2 size={15} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="p-7">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Delete this plan?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm mt-2">This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel className="h-10 px-5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlan} className="bg-[#C53B3B] text-white hover:bg-[#A52E2E] h-10 px-5 font-semibold">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
