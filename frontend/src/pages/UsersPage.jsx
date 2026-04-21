import React, { useState, useEffect, useCallback } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../lib/api';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '../components/ui/dialog';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader, { PageContainer } from '../components/PageHeader';
import ConfirmDialog from '../components/ConfirmDialog';

const emptyUser = { email: '', name: '', role: 'hc' };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState(emptyUser);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUsers(search, filterRole === 'all' ? '' : filterRole);
      setUsers(res.users || []);
      setTotal(res.total || 0);
    } catch (err) { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [search, filterRole]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => { setEditId(null); setEditData({ ...emptyUser }); setEditOpen(true); };
  const openEdit = (u) => {
    setEditId(u._id);
    setEditData({ email: u.email || '', name: u.name || '', role: u.role || 'hc' });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editData.email.trim() || !editData.name.trim()) {
      toast.error('Name and email are required'); return;
    }
    setSaving(true);
    try {
      if (editId) { await updateUser(editId, editData); toast.success('User updated'); }
      else { await createUser(editData); toast.success('User pre-registered.'); }
      setEditOpen(false); fetchData();
    } catch (err) { toast.error(err.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteUser(deleteId); toast.success('User deleted'); fetchData(); }
    catch (err) { toast.error(err.message || 'Delete failed'); }
    finally { setDeleteId(null); }
  };

  return (
    <PageContainer>
      <PageHeader title="Users" subtitle={`${total} user${total !== 1 ? 's' : ''} registered`}>
        <button
          onClick={openAdd}
          data-testid="admin-users-add-button"
          className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md text-[13px] font-medium bg-[color:var(--accent-teal)] text-white hover:bg-[color:var(--accent-teal-hover)] shadow-[var(--shadow-xs)]"
        >
          <Plus size={14} /> Add user
        </button>
      </PageHeader>

      <div className="px-8 py-6">
        {/* Filters */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-[360px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="admin-users-search-input"
              className="pl-9 h-9 text-[13px] bg-white"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[160px] h-9 text-[13px] bg-white" data-testid="admin-users-filter-role">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="hc">Health coach</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div
          className="rounded-lg border hairline surface overflow-hidden shadow-[var(--shadow-xs)]"
          data-testid="admin-users-table"
        >
          <div
            className="grid items-center h-9 px-5 hairline-b text-[10px] font-semibold tracking-[0.09em] uppercase text-[color:var(--accent-teal)]"
            style={{
              gridTemplateColumns: 'minmax(180px,1fr) 1.2fr 130px 140px 72px',
              background: 'linear-gradient(90deg, rgba(13,95,104,0.08) 0%, rgba(70,152,157,0.12) 50%, rgba(13,95,104,0.08) 100%)',
            }}
          >
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Created</span>
            <span />
          </div>

          {loading ? (
            <div className="h-40 flex items-center justify-center gap-2 text-[12px] text-ink-muted">
              <div className="w-4 h-4 border-2 border-[color:var(--accent-teal)] border-t-transparent rounded-full animate-spin" />
              Loading…
            </div>
          ) : users.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-[13px] text-ink-muted">No users found</div>
          ) : (
            users.map(u => (
              <div
                key={u._id}
                className="grid items-center min-h-[48px] px-5 py-2 border-b border-[color:var(--hairline)] last:border-b-0 row-hover transition-colors group"
                style={{ gridTemplateColumns: 'minmax(180px,1fr) 1.2fr 130px 140px 72px' }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[color:var(--accent-teal-wash)] flex items-center justify-center text-[11px] font-semibold text-[color:var(--accent-teal)] shrink-0">
                    {u.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <span className="text-[13px] font-medium text-ink truncate">{u.name}</span>
                </div>
                <span className="text-[12.5px] text-ink-muted truncate">{u.email}</span>
                <span>
                  <span className={`inline-flex items-center h-5 px-1.5 rounded text-[10px] font-semibold uppercase tracking-[0.08em] ${
                    u.role === 'admin'
                      ? 'bg-[color:var(--accent-teal-wash)] text-[color:var(--accent-teal)]'
                      : 'bg-[color:var(--surface-subtle)] text-ink-3'
                  }`}>
                    {u.role === 'admin' ? 'Admin' : 'Health coach'}
                  </span>
                </span>
                <span className="text-[12px] text-ink-muted">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </span>
                <span className="flex items-center justify-end gap-0.5">
                  <button
                    onClick={() => openEdit(u)}
                    data-testid={`edit-user-${u._id}`}
                    className="h-7 w-7 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 text-ink-subtle hover:text-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-wash)]"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setDeleteId(u._id)}
                    data-testid={`delete-user-${u._id}`}
                    className="h-7 w-7 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 text-ink-subtle hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[460px] p-0 gap-0 overflow-hidden rounded-xl border hairline shadow-[var(--shadow-lg)]">
          <DialogHeader className="px-6 pt-6 pb-4 space-y-1">
            <DialogTitle className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
              {editId ? 'Edit user' : 'Pre-register user'}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-ink-muted">
              {editId ? 'Update user details.' : 'Pre-register with email and role. User signs in via Clerk.'}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-5 grid gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-ink-3">Full name <span className="text-red-600">*</span></Label>
              <Input
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="h-9 text-[13px]"
                placeholder="e.g. Sarah Johnson"
                data-testid="user-form-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-ink-3">Email <span className="text-red-600">*</span></Label>
              <Input
                type="email"
                value={editData.email}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                className="h-9 text-[13px]"
                placeholder="e.g. sarah@clinic.com"
                data-testid="user-form-email"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-ink-3">Role</Label>
              <Select value={editData.role} onValueChange={(v) => setEditData({ ...editData, role: v })}>
                <SelectTrigger className="h-9 text-[13px]" data-testid="user-form-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="hc">Health coach</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 bg-[color:var(--surface-hover)] hairline-t gap-2">
            <button
              onClick={() => setEditOpen(false)}
              className="h-9 px-4 rounded-md text-[13px] font-medium border hairline bg-white hover:bg-[color:var(--surface-subtle)] text-ink-3 hover:text-ink"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              data-testid="user-form-submit"
              className="h-9 px-4 rounded-md text-[13px] font-semibold bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white disabled:opacity-60"
            >
              {saving ? 'Saving…' : editId ? 'Update user' : 'Create user'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete this user?"
        description="This action cannot be undone. The user will lose access immediately."
        confirmLabel="Delete user"
        destructive
        onConfirm={handleDelete}
      />
    </PageContainer>
  );
}
