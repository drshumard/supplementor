import React, { useState, useEffect, useCallback } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, Users, ShieldCheck, UserCog } from 'lucide-react';
import { toast } from 'sonner';

const emptyUser = { email: '', name: '', role: 'hc', password: '' };

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
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, filterRole]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => { setEditId(null); setEditData({ ...emptyUser }); setEditOpen(true); };
  const openEdit = (u) => {
    setEditId(u._id);
    setEditData({ email: u.email || '', name: u.name || '', role: u.role || 'hc', password: '' });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editData.email.trim() || !editData.name.trim()) {
      toast.error('Name and email are required');
      return;
    }
    if (!editId && !editData.password.trim()) {
      toast.error('Password is required for new users');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...editData };
      if (editId && !payload.password.trim()) {
        delete payload.password;
      }
      if (editId) {
        await updateUser(editId, payload);
        toast.success('User updated');
      } else {
        await createUser(payload);
        toast.success('User created');
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
      await deleteUser(deleteId);
      toast.success('User deleted');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleteId(null);
    }
  };

  const adminCount = users.filter(u => u.role === 'admin').length;
  const hcCount = users.filter(u => u.role === 'hc').length;

  return (
    <div className="p-10 max-w-[1560px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#0B0D10]">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} user{total !== 1 ? 's' : ''} registered</p>
        </div>
        <Button onClick={openAdd} data-testid="admin-users-add-button"
          className="gap-2.5 h-12 px-7 bg-[#0B0D10] hover:bg-[#1a1d21] text-white font-bold shadow-sm text-sm">
          <Plus size={18} /> Add User
        </Button>
      </div>

      {/* Summary pills */}
      <div className="flex items-center gap-5 mb-6">
        <div className="rounded-xl bg-[#EAF4F3] border border-[#C8E6E0] px-5 py-3 flex items-center gap-3">
          <Users size={16} className="text-[#0D5F68]" />
          <span className="text-sm font-semibold text-[#61746E]">{total} Total</span>
        </div>
        <div className="rounded-xl bg-[#EAF4F3] border border-[#C8E6E0] px-5 py-3 flex items-center gap-3">
          <ShieldCheck size={16} className="text-[#0D5F68]" />
          <span className="text-sm font-semibold text-[#61746E]">{adminCount} Admin{adminCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="rounded-xl bg-[#E8F5E9] border border-[#C8E6C9] px-5 py-3 flex items-center gap-3">
          <UserCog size={16} className="text-[#147D5A]" />
          <span className="text-sm font-semibold text-[#2E7D32]">{hcCount} Health Coach{hcCount !== 1 ? 'es' : ''}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-[400px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="admin-users-search-input" className="pl-11 h-12" />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[180px] h-12" data-testid="admin-users-filter-role">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="hc">Health Coach</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white card-elevated overflow-hidden" data-testid="admin-users-table">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-[#EAF4F3] border-b-2 border-[#E2E8F0]">
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-[#4A5568] py-4 px-6">Name</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-[#4A5568] py-4">Email</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-[#4A5568] py-4 w-[140px]">Role</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-[#4A5568] py-4">Created</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-[0.05em] uppercase text-[#4A5568] py-4 w-[110px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-[#0D5F68] border-t-transparent rounded-full animate-spin" /> Loading...
                </div>
              </TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-40 text-center text-muted-foreground text-base">No users found</TableCell></TableRow>
            ) : (
              users.map(u => (
                <TableRow key={u._id} className="hover:bg-[#F0FAFA]">
                  <TableCell className="py-5 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#EAF4F3] flex items-center justify-center text-sm font-bold text-[#0D5F68]">
                        {u.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="font-bold text-sm text-[#0B0D10]">{u.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground py-5">{u.email}</TableCell>
                  <TableCell className="py-5">
                    <Badge className={`px-3 py-1.5 text-[10px] font-bold ${
                      u.role === 'admin'
                        ? 'bg-[#0D5F68] text-white hover:bg-[#0D5F68]'
                        : 'bg-[#147D5A] text-white hover:bg-[#147D5A]'
                    }`}>
                      {u.role === 'admin' ? 'Admin' : 'Health Coach'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground py-5">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                  </TableCell>
                  <TableCell className="py-5">
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg hover:bg-[#E0F2F1] text-muted-foreground hover:text-[#0D5F68]"
                        onClick={() => openEdit(u)} data-testid={`edit-user-${u._id}`}><Pencil size={15} /></Button>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg text-muted-foreground hover:text-[#C53B3B] hover:bg-red-50"
                        onClick={() => setDeleteId(u._id)} data-testid={`delete-user-${u._id}`}><Trash2 size={15} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[480px] p-7">
          <DialogHeader>
            <DialogTitle className="text-lg">{editId ? 'Edit User' : 'Add User'}</DialogTitle>
            <DialogDescription className="text-sm mt-1">
              {editId ? 'Update user details. Leave password blank to keep current.' : 'Create a new user account.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Full Name *</Label>
              <Input value={editData.name} onChange={(e) => setEditData({...editData, name: e.target.value})}
                className="h-12" placeholder="e.g. Sarah Johnson" data-testid="user-form-name" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Email *</Label>
              <Input type="email" value={editData.email} onChange={(e) => setEditData({...editData, email: e.target.value})}
                className="h-12" placeholder="e.g. sarah@clinic.com" data-testid="user-form-email" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Role</Label>
              <Select value={editData.role} onValueChange={(v) => setEditData({...editData, role: v})}>
                <SelectTrigger className="h-12" data-testid="user-form-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="hc">Health Coach</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">{editId ? 'New Password (leave blank to keep)' : 'Password *'}</Label>
              <Input type="password" value={editData.password} onChange={(e) => setEditData({...editData, password: e.target.value})}
                className="h-12" placeholder={editId ? 'Leave blank to keep current' : 'Enter password'}
                data-testid="user-form-password" />
            </div>
          </div>
          <DialogFooter className="gap-3 mt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="h-11 px-5">Cancel</Button>
            <Button onClick={handleSave} disabled={saving}
              className="h-11 px-6 bg-[#0D5F68] hover:bg-[#0A4E55] text-white font-semibold"
              data-testid="user-form-submit">
              {saving ? 'Saving...' : (editId ? 'Update User' : 'Create User')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="p-7">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Delete this user?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm mt-2">
              This action cannot be undone. The user will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel className="h-10 px-5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}
              className="bg-[#C53B3B] text-white hover:bg-[#A52E2E] h-10 px-5 font-semibold">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
