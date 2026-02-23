import React, { useEffect, useMemo, useState } from 'react';
import API from '../../api/axios';

const ROLE_OPTIONS = [
  { label: 'Admin', value: 'admin' },
  { label: 'School Head', value: 'school_head' },
  { label: 'Teacher', value: 'teacher' },
  { label: 'Student', value: 'student' },
];

const DEFAULT_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'teacher',
  password: '',
  phone: '',
  address: '',
  isActive: true,
};

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  const title = useMemo(
    () => (editingId ? 'Update User Account' : 'Create User Account'),
    [editingId]
  );

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await API.get('/admin/users', {
        params: {
          limit: 300,
          search: search || undefined,
          role: roleFilter || undefined,
        },
      });
      setUsers(data?.data?.users || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        role: form.role,
        phone: form.phone.trim(),
        address: form.address.trim(),
        isActive: Boolean(form.isActive),
      };

      if (form.password.trim()) {
        payload.password = form.password.trim();
      }

      if (editingId) {
        await API.put(`/admin/users/${editingId}`, payload);
      } else {
        await API.post('/admin/users', payload);
      }

      resetForm();
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (user) => {
    setEditingId(user.id);
    setForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      role: user.role || 'teacher',
      password: '',
      phone: user.phone || '',
      address: user.address || '',
      isActive: Boolean(user.isActive),
    });
  };

  const toggleStatus = async (user) => {
    setError('');
    try {
      await API.patch(`/admin/users/${user.id}/status`, { isActive: !user.isActive });
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change account status');
    }
  };

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">User Administration</h2>
            <p className="mt-1 text-sm text-slate-600">Create, update, and activate/deactivate platform accounts.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search users"
              className="input-field min-w-[210px]"
            />
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="input-field min-w-[170px]"
            >
              <option value="">All Roles</option>
              {ROLE_OPTIONS.map((roleOption) => (
                <option key={roleOption.value} value={roleOption.value}>
                  {roleOption.label}
                </option>
              ))}
            </select>
            <button type="button" className="btn-primary" onClick={fetchUsers}>
              Apply Filters
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="card">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <form className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <input
            className="input-field"
            placeholder="First name"
            value={form.firstName}
            onChange={(event) => setForm((previous) => ({ ...previous, firstName: event.target.value }))}
            required
          />
          <input
            className="input-field"
            placeholder="Last name"
            value={form.lastName}
            onChange={(event) => setForm((previous) => ({ ...previous, lastName: event.target.value }))}
            required
          />
          <input
            className="input-field"
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))}
            required
          />
          <select
            className="input-field"
            value={form.role}
            onChange={(event) => setForm((previous) => ({ ...previous, role: event.target.value }))}
          >
            {ROLE_OPTIONS.map((roleOption) => (
              <option key={roleOption.value} value={roleOption.value}>
                {roleOption.label}
              </option>
            ))}
          </select>
          <input
            className="input-field"
            type="password"
            placeholder={editingId ? 'New password (optional)' : 'Initial password'}
            value={form.password}
            onChange={(event) => setForm((previous) => ({ ...previous, password: event.target.value }))}
            required={!editingId}
          />
          <input
            className="input-field"
            placeholder="Phone"
            value={form.phone}
            onChange={(event) => setForm((previous) => ({ ...previous, phone: event.target.value }))}
          />
          <input
            className="input-field md:col-span-2"
            placeholder="Address"
            value={form.address}
            onChange={(event) => setForm((previous) => ({ ...previous, address: event.target.value }))}
          />
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(form.isActive)}
              onChange={(event) => setForm((previous) => ({ ...previous, isActive: event.target.checked }))}
            />
            Account is active
          </label>

          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update User' : 'Create User'}
            </button>
            {editingId && (
              <button type="button" className="btn-danger" onClick={resetForm}>
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="card">
        <h3 className="text-base font-semibold text-slate-900">User Accounts</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="table-header">Name</th>
                <th className="table-header">Email</th>
                <th className="table-header">Role</th>
                <th className="table-header">Status</th>
                <th className="table-header">Last Login</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && users.map((user) => (
                <tr key={user.id}>
                  <td className="table-cell">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="table-cell">{user.email}</td>
                  <td className="table-cell">
                    <span className="badge-blue capitalize">{String(user.role || '').replace('_', ' ')}</span>
                  </td>
                  <td className="table-cell">
                    <span className={user.isActive ? 'badge-green' : 'badge-red'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                  </td>
                  <td className="table-cell">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn-primary py-1.5 px-3 text-xs" onClick={() => startEdit(user)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-danger py-1.5 px-3 text-xs"
                        onClick={() => toggleStatus(user)}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr>
                  <td className="table-cell text-center text-slate-500" colSpan={6}>
                    No users found.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="table-cell text-center text-slate-500" colSpan={6}>
                    Loading user accounts...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
