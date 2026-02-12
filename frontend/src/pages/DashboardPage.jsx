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
import { Plus, Search, Trash2, ExternalLink, FileText, Copy } from 'lucide-react';
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

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

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
    <div className="p-8 max-w-[1560px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.01em] text-[#0B0D10]">
            Patient Plans
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} plan{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button
          onClick={() => navigate('/plans/new')}
          data-testid="plans-create-new-button"
          className="gap-2"
        >
          <Plus size={16} />
          New Plan
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-[320px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search patients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="plans-search-input"
            className="pl-9 h-9"
          />
        </div>
        <Select value={program} onValueChange={setProgram}>
          <SelectTrigger className="w-[180px] h-9" data-testid="plans-filter-program">
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
      <div className="rounded-xl border bg-card shadow-[var(--shadow-sm)]" data-testid="plans-table">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground">Patient</TableHead>
              <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground">Program</TableHead>
              <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground">Step</TableHead>
              <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground">Months</TableHead>
              <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground text-right">Total Cost</TableHead>
              <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground">Status</TableHead>
              <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground">Last Updated</TableHead>
              <TableHead className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-[hsl(187,79%,23%)] border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText size={32} strokeWidth={1} />
                    <p className="text-sm">No plans yet</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/plans/new')}
                      className="mt-2"
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
                  className="cursor-pointer hover:bg-[var(--table-zebra)] transition-colors"
                  onClick={() => navigate(`/plans/${plan._id}`)}
                >
                  <TableCell className="font-medium text-[#0B0D10]">
                    {plan.patient_name || 'Untitled'}
                  </TableCell>
                  <TableCell className="text-sm">{plan.program_name}</TableCell>
                  <TableCell className="text-sm">{plan.step_label || `Step ${plan.step_number}`}</TableCell>
                  <TableCell className="text-sm font-mono tabular-nums">
                    {plan.months?.length || 0}
                  </TableCell>
                  <TableCell className="text-sm font-mono tabular-nums text-right text-[#147D5A] font-medium">
                    {formatCurrency(plan.total_program_cost)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={plan.status === 'finalized' ? 'default' : 'secondary'}
                      data-testid={`plan-status-${plan._id}`}
                      className={plan.status === 'finalized'
                        ? 'bg-[hsl(147,70%,30%)] text-white'
                        : 'bg-[#EEF1F1] text-[#61746E]'}
                    >
                      {plan.status || 'draft'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {plan.updated_at
                      ? new Date(plan.updated_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-[hsl(187,79%,23%)]"
                        onClick={(e) => handleDuplicate(e, plan._id)}
                        title="Duplicate plan"
                      >
                        <Copy size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(plan._id);
                        }}
                        data-testid={`delete-plan-${plan._id}`}
                      >
                        <Trash2 size={14} />
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The plan and all its data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
