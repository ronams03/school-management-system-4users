import React, { useEffect, useState } from 'react';
import API from '../../api/axios';

const DEFAULT_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  address: '',
  department: '',
  qualification: '',
  specialization: '',
  joiningDate: '',
  isActive: true,
};

export default function TeacherList() {
  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  const fetchTeachers = async (searchTerm = '') => {
    setLoading(true);
    setError('');
    try {
      const [teacherResponse, departmentResponse] = await Promise.all([
        API.get('/teachers', {
          params: {
            limit: 300,
            search: searchTerm || undefined,
          },
        }),
        API.get('/departments', { params: { active: true } }),
      ]);

      setTeachers(teacherResponse?.data?.data?.teachers || []);
      setDepartments(departmentResponse?.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
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
        phone: form.phone.trim(),
        address: form.address.trim(),
        department: form.department || null,
        qualification: form.qualification.trim(),
        specialization: form.specialization.trim(),
        joiningDate: form.joiningDate || null,
        isActive: Boolean(form.isActive),
      };

      if (form.password.trim()) {
        payload.password = form.password.trim();
      }

      if (editingId) {
        await API.put(`/teachers/${editingId}`, payload);
      } else {
        await API.post('/teachers', payload);
      }

      resetForm();
      await fetchTeachers(search);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save teacher');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (teacher) => {
    const user = teacher.user || {};
    setEditingId(teacher.id);
    setForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      password: '',
      phone: user.phone || '',
      address: user.address || '',
      department: teacher.departmentId || '',
      qualification: teacher.qualification || '',
      specialization: teacher.specialization || '',
      joiningDate: teacher.joiningDate ? String(teacher.joiningDate).slice(0, 10) : '',
      isActive: Boolean(teacher.isActive),
    });
  };

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Teacher Management</h2>
            <p className="mt-1 text-sm text-slate-600">Maintain teacher accounts and assignment metadata.</p>
          </div>
          <div className="flex gap-2">
            <input
              className="input-field min-w-[230px]"
              placeholder="Search teachers"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button type="button" className="btn-primary" onClick={() => fetchTeachers(search)}>
              Search
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
        <h3 className="text-base font-semibold text-slate-900">
          {editingId ? 'Update Teacher' : 'Create Teacher'}
        </h3>
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
            placeholder="Email"
            value={form.email}
            onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))}
            required
          />
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
            className="input-field"
            placeholder="Address"
            value={form.address}
            onChange={(event) => setForm((previous) => ({ ...previous, address: event.target.value }))}
          />
          <select
            className="input-field"
            value={form.department}
            onChange={(event) => setForm((previous) => ({ ...previous, department: event.target.value }))}
          >
            <option value="">No department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
          <input
            className="input-field"
            placeholder="Qualification"
            value={form.qualification}
            onChange={(event) => setForm((previous) => ({ ...previous, qualification: event.target.value }))}
          />
          <input
            className="input-field"
            placeholder="Specialization"
            value={form.specialization}
            onChange={(event) => setForm((previous) => ({ ...previous, specialization: event.target.value }))}
          />
          <input
            className="input-field"
            type="date"
            value={form.joiningDate}
            onChange={(event) => setForm((previous) => ({ ...previous, joiningDate: event.target.value }))}
          />
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(form.isActive)}
              onChange={(event) => setForm((previous) => ({ ...previous, isActive: event.target.checked }))}
            />
            Active
          </label>

          <div className="md:col-span-2 flex gap-2">
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Teacher' : 'Create Teacher'}
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
        <h3 className="text-base font-semibold text-slate-900">Teachers</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="table-header">Teacher</th>
                <th className="table-header">Teacher ID</th>
                <th className="table-header">Department</th>
                <th className="table-header">Specialization</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && teachers.map((teacher) => (
                <tr key={teacher.id}>
                  <td className="table-cell">
                    <p className="font-medium text-slate-800">
                      {teacher.user?.firstName} {teacher.user?.lastName}
                    </p>
                    <p className="text-xs text-slate-500">{teacher.user?.email}</p>
                  </td>
                  <td className="table-cell">{teacher.teacherId || 'N/A'}</td>
                  <td className="table-cell">{teacher.department?.name || 'N/A'}</td>
                  <td className="table-cell">{teacher.specialization || 'N/A'}</td>
                  <td className="table-cell">
                    <span className={teacher.isActive ? 'badge-green' : 'badge-red'}>
                      {teacher.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <button type="button" className="btn-primary py-1.5 px-3 text-xs" onClick={() => startEdit(teacher)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && teachers.length === 0 && (
                <tr>
                  <td className="table-cell text-center text-slate-500" colSpan={6}>
                    No teachers found.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="table-cell text-center text-slate-500" colSpan={6}>
                    Loading teachers...
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
