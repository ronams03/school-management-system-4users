import React, { useEffect, useState } from 'react';
import API from '../../api/axios';

const DEFAULT_FORM = {
  name: '',
  code: '',
  description: '',
  isActive: true,
};

export default function DepartmentManager() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  const fetchDepartments = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await API.get('/departments', {
        params: { includeCounts: true },
      });
      setDepartments(data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
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
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
        isActive: Boolean(form.isActive),
      };

      if (editingId) {
        await API.put(`/departments/${editingId}`, payload);
      } else {
        await API.post('/departments', payload);
      }

      resetForm();
      await fetchDepartments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save department');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (department) => {
    setEditingId(department.id);
    setForm({
      name: department.name || '',
      code: department.code || '',
      description: department.description || '',
      isActive: Boolean(department.isActive),
    });
  };

  const deactivateDepartment = async (departmentId) => {
    setError('');
    try {
      await API.delete(`/departments/${departmentId}`);
      await fetchDepartments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate department');
    }
  };

  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="text-xl font-semibold text-slate-900">Department Management</h2>
        <p className="mt-1 text-sm text-slate-600">Create and maintain the academic department catalog.</p>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="card">
        <h3 className="text-base font-semibold text-slate-900">
          {editingId ? 'Update Department' : 'Create Department'}
        </h3>
        <form className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <input
            className="input-field"
            placeholder="Department name"
            value={form.name}
            onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
            required
          />
          <input
            className="input-field"
            placeholder="Code (e.g. CSE)"
            value={form.code}
            onChange={(event) => setForm((previous) => ({ ...previous, code: event.target.value }))}
            required
          />
          <textarea
            className="input-field md:col-span-2 min-h-[90px]"
            placeholder="Description"
            value={form.description}
            onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
          />
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(form.isActive)}
              onChange={(event) => setForm((previous) => ({ ...previous, isActive: event.target.checked }))}
            />
            Active department
          </label>

          <div className="md:col-span-2 flex gap-2">
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Department' : 'Create Department'}
            </button>
            {editingId && (
              <button className="btn-danger" type="button" onClick={resetForm}>
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="card">
        <h3 className="text-base font-semibold text-slate-900">Departments</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="table-header">Name</th>
                <th className="table-header">Code</th>
                <th className="table-header">Students</th>
                <th className="table-header">Teachers</th>
                <th className="table-header">Courses</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && departments.map((department) => (
                <tr key={department.id}>
                  <td className="table-cell">
                    <p className="font-medium text-slate-800">{department.name}</p>
                    <p className="text-xs text-slate-500">{department.description || 'No description'}</p>
                  </td>
                  <td className="table-cell">{department.code}</td>
                  <td className="table-cell">{department.metrics?.studentCount ?? 0}</td>
                  <td className="table-cell">{department.metrics?.teacherCount ?? 0}</td>
                  <td className="table-cell">{department.metrics?.courseCount ?? 0}</td>
                  <td className="table-cell">
                    <span className={department.isActive ? 'badge-green' : 'badge-red'}>
                      {department.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn-primary py-1.5 px-3 text-xs" onClick={() => startEdit(department)}>
                        Edit
                      </button>
                      {department.isActive && (
                        <button
                          type="button"
                          className="btn-danger py-1.5 px-3 text-xs"
                          onClick={() => deactivateDepartment(department.id)}
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && departments.length === 0 && (
                <tr>
                  <td className="table-cell text-center text-slate-500" colSpan={7}>
                    No departments found.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="table-cell text-center text-slate-500" colSpan={7}>
                    Loading departments...
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
