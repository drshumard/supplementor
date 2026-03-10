import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { getPlans, deletePlan, duplicatePlan } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Plus, Search, Trash2, FileText, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/utils';

export default function DashboardPage() {
  const [plans, setPlans] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [program, setProgram] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPlans(search, program === 'all' ? '' : program);
      setPlans(res.plans || []); setTotal(res.total || 0);
    } catch (err) { toast.error('Failed to load plans'); }
    finally { setLoading(false); }
  }, [search, program]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deletePlan(deleteId); toast.success('Plan deleted'); fetchPlans(); }
    catch (err) { toast.error('Delete failed'); }
    finally { setDeleteId(null); }
  };

  const handleDuplicate = async (e, planId) => {
    e.stopPropagation();
    try { const result = await duplicatePlan(planId); toast.success('Plan duplicated'); navigate(`/plans/${result._id}`); }
    catch (err) { toast.error('Duplicate failed'); }
  };

  return (
    <div className="p-10 max-w-[1560px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#0B0D10]">
            Patient Plans
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and track all supplement protocols
          </p>
        </div>
        <Button
          onClick={() => navigate('/plans/new')}
          data-testid="plans-create-new-button"
          className="gap-2.5 h-12 px-7 bg-[#0D5F68] hover:bg-[#0A4E55] text-white font-bold shadow-sm text-sm"
        >
          <Plus size={18} />
          New Plan
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-[360px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search patients..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="plans-search-input" className="pl-11 h-12" />
        </div>
        <Select value={program} onValueChange={setProgram}>
          <SelectTrigger className="w-[200px] h-12" data-testid="plans-filter-program">
            <SelectValue placeholder="All Programs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            <SelectItem value="Detox 1">Detox 1</SelectItem>
            <SelectItem value="Detox 2">Detox 2</SelectItem>
            <SelectItem value="Maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white card-elevated overflow-hidden" data-testid="plans-table">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#0D5F68] hover:bg-[#0D5F68] rounded-t-xl">
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-3.5 px-6">Patient</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-3.5">Program</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-3.5">Step</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-3.5 w-[70px]">Months</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-3.5 w-[130px]">Total Cost</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-3.5 w-[120px]">Status</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-3.5">Updated</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-white/80 py-3.5 w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="h-40 text-center text-muted-foreground">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-[#0D5F68] border-t-transparent rounded-full animate-spin" /> Loading...
                </div>
              </TableCell></TableRow>
            ) : plans.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-40 text-center">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <FileText size={40} strokeWidth={1} />
                  <p className="text-base">No plans yet</p>
                  <Button onClick={() => navigate('/plans/new')} className="mt-2 h-11 px-5 bg-[#0D5F68] hover:bg-[#0A4E55] text-white font-semibold">Create your first plan</Button>
                </div>
              </TableCell></TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow key={plan._id} className="cursor-pointer hover:bg-[#F0FAFA] transition-colors duration-150" onClick={() => navigate(`/plans/${plan._id}`)}>
                  <TableCell className="font-semibold text-[#0B0D10] py-4 px-6 text-sm">{plan.patient_name || 'Untitled'}</TableCell>
                  <TableCell className="text-sm text-[#334155] py-4">{plan.program_name}</TableCell>
                  <TableCell className="text-sm text-[#334155] py-4">{plan.step_label || `Step ${plan.step_number}`}</TableCell>
                  <TableCell className="text-sm font-mono tabular-nums py-4 w-[70px] text-[#334155]">{plan.months?.length || 0}</TableCell>
                  <TableCell className="text-sm font-mono tabular-nums py-4 text-[#147D5A] font-semibold w-[130px]">{formatCurrency(plan.total_program_cost)}</TableCell>
                  <TableCell className="py-4 w-[120px]">
                    <Badge data-testid={`plan-status-${plan._id}`}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-md ${
                        plan.status === 'finalized'
                          ? 'bg-[#0D5F68] text-white hover:bg-[#0D5F68]'
                          : 'bg-[#FEF3C7] text-[#92400E] hover:bg-[#FEF3C7]'
                      }`}>
                      {plan.status || 'draft'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-[#718096] py-4">
                    {plan.updated_at ? new Date(plan.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#94A3B8] hover:text-[#0D5F68] hover:bg-[#EAF4F3] rounded-lg"
                        onClick={(e) => handleDuplicate(e, plan._id)} title="Duplicate" data-testid={`duplicate-plan-${plan._id}`}><Copy size={14} /></Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#94A3B8] hover:text-[#C53B3B] hover:bg-red-50 rounded-lg"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(plan._id); }} data-testid={`delete-plan-${plan._id}`}><Trash2 size={14} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="p-7">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Delete this plan?</AlertDialogTitle>
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
