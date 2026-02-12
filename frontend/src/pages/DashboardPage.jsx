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
      setPlans(res.plans || []);
      setTotal(res.total || 0);
    } catch (err) {
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, [search, program]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deletePlan(deleteId);
      toast.success('Plan deleted');
      fetchPlans();
    } catch (err) {
      toast.error('Delete failed');
    } finally {
      setDeleteId(null);
    }
  };

  const handleDuplicate = async (e, planId) => {
    e.stopPropagation();
    try {
      const result = await duplicatePlan(planId);
      toast.success('Plan duplicated');
      navigate(`/plans/${result._id}`);
    } catch (err) {
      toast.error('Duplicate failed');
    }
  };

  return (
    <div className="p-10 max-w-[1560px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#0B0D10]">
            Patient Plans
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {total} plan{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button
          onClick={() => navigate('/plans/new')}
          data-testid="plans-create-new-button"
          className="gap-2.5 h-11 px-6 bg-[hsl(187,79%,23%)] hover:bg-[hsl(187,79%,28%)] text-white font-semibold shadow-sm"
        >
          <Plus size={18} />
          New Plan
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-8">
        <div className="relative flex-1 max-w-[360px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search patients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="plans-search-input"
            className="pl-11 h-11"
          />
        </div>
        <Select value={program} onValueChange={setProgram}>
          <SelectTrigger className="w-[200px] h-11" data-testid="plans-filter-program">
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
      <div className="rounded-xl border bg-card shadow-[var(--shadow-sm)] overflow-hidden" data-testid="plans-table">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-[#FAFBFB]">
              <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4.5 px-5">Patient</TableHead>
              <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4.5">Program</TableHead>
              <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4.5">Step</TableHead>
              <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4.5">Months</TableHead>
              <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4.5 text-right">Total Cost</TableHead>
              <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4.5">Status</TableHead>
              <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4.5">Last Updated</TableHead>
              <TableHead className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground py-4.5 w-[120px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-40 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-[hsl(187,79%,23%)] border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <FileText size={40} strokeWidth={1} />
                    <p className="text-base">No plans yet</p>
                    <Button
                      onClick={() => navigate('/plans/new')}
                      className="mt-2 h-10 px-5 bg-[hsl(187,79%,23%)] hover:bg-[hsl(187,79%,28%)] text-white"
                    >
                      Create your first plan
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow
                  key={plan._id}
                  className="cursor-pointer hover:bg-[hsl(174,35%,93%)]/30 transition-colors"
                  onClick={() => navigate(`/plans/${plan._id}`)}
                >
                  <TableCell className="font-semibold text-[#0B0D10] py-4 px-5 text-sm">
                    {plan.patient_name || 'Untitled'}
                  </TableCell>
                  <TableCell className="text-sm py-4">{plan.program_name}</TableCell>
                  <TableCell className="text-sm py-4">{plan.step_label || `Step ${plan.step_number}`}</TableCell>
                  <TableCell className="text-sm font-mono tabular-nums py-4">
                    {plan.months?.length || 0}
                  </TableCell>
                  <TableCell className="text-sm font-mono tabular-nums text-right py-4 text-[#147D5A] font-semibold">
                    {formatCurrency(plan.total_program_cost)}
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge
                      data-testid={`plan-status-${plan._id}`}
                      className={`px-3 py-1 text-xs font-semibold ${
                        plan.status === 'finalized'
                          ? 'bg-emerald-600 text-white hover:bg-emerald-600'
                          : 'bg-[#EEF1F1] text-[#61746E] hover:bg-[#EEF1F1]'
                      }`}
                    >
                      {plan.status || 'draft'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground py-4">
                    {plan.updated_at
                      ? new Date(plan.updated_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })
                      : '-'}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 text-muted-foreground hover:text-[hsl(187,79%,23%)] hover:bg-[hsl(174,35%,93%)] rounded-lg"
                        onClick={(e) => handleDuplicate(e, plan._id)}
                        title="Duplicate plan"
                        data-testid={`duplicate-plan-${plan._id}`}
                      >
                        <Copy size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(plan._id);
                        }}
                        data-testid={`delete-plan-${plan._id}`}
                      >
                        <Trash2 size={15} />
                      </Button>
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
            <AlertDialogDescription className="text-sm mt-2">
              This action cannot be undone. The plan and all its data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel className="h-10 px-5">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700 h-10 px-5 font-semibold"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
