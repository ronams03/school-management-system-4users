import React, { useEffect, useState } from 'react';
import API from '../../api/axios';

const DEFAULT_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  address: '',
  dateOfBirth: '',
  gender: 'male',
  department: '',
  currentYear: 1,
  currentSemester: 1,
  guardianName: '',
  guardianPhone: '',
  guardianEmail: '',
  bloodGroup: '',
  status: 'active',
};

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  const fetchStudents = async (searchTerm = '') => {
    setLoading(true);
    setError('');
    try {
      const [studentsResponse, departmentResponse] = await Promise.all([
        API.get('/students', {
          params: {
            limit: 300,
            search: searchTerm || undefined,
          },
        }),
        API.get('/departments', {
          params: { active: true },
        }),
      ]);

      setStudents(studentsResponse?.data?.data?.students || []);
      setDepartments(departmentResponse?.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
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
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        department: form.department || null,
        currentYear: Number(form.currentYear) || 1,
        currentSemester: Number(form.currentSemester) || 1,
        guardianName: form.guardianName.trim(),
        guardianPhone: form.guardianPhone.trim(),
        guardianEmail: form.guardianEmail.trim(),
        bloodGroup: form.bloodGroup.trim(),
        status: form.status,
      };

      if (form.password.trim()) {
        payload.password = form.password.trim();
      }

      if (editingId) {
        await API.put(`/students/${editingId}`, payload);
      } else {
        await API.post('/students', payload);
      }

      resetForm();
      await fetchStudents(search);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save student');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (student) => {
    const user = student.user || {};
    setEditingId(student.id);
    setForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      password: '',
      phone: user.phone || '',
      address: user.address || '',
      dateOfBirth: student.dateOfBirth ? String(student.dateOfBirth).slice(0, 10) : '',
      gender: student.gender || 'male',
      department: student.departmentId || '',
      currentYear: student.currentYear || 1,
      currentSemester: student.currentSemester || 1,
      guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '',
      guardianEmail: student.guardianEmail || '',
      bloodGroup: student.bloodGroup || '',
      status: student.status || 'active',
    });
  };

  const handleDelete = async (student) => {
    const shouldDelete = window.confirm(
      `Deactivate ${student.user?.firstName || ''} ${student.user?.lastName || ''} (${student.studentId})?`
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingId(student.id);
    setError('');
    try {
      await API.delete(`/students/${student.id}`);
      if (editingId === student.id) {
        resetForm();
      }
      await fetchStudents(search);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete student');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Student Management</h2>
            <p className="mt-1 text-sm text-slate-600">Create and update student records with guardian and academic details.</p>
          </div>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search students"
              className="input-field min-w-[230px]"
            />
            <button type="button" className="btn-primary" onClick={() => fetchStudents(search)}>
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
          {editingId ? 'Update Student' : 'Create Student'}
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
          <input
            className="input-field"
            type="date"
            value={form.dateOfBirth}
            onChange={(event) => setForm((previous) => ({ ...previous, dateOfBirth: event.target.value }))}
            required
          />
          <select
            className="input-field"
            value={form.gender}
            onChange={(event) => setForm((previous) => ({ ...previous, gender: event.target.value }))}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
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
          <select
            className="input-field"
            value={form.status}
            onChange={(event) => setForm((previous) => ({ ...previous, status: event.target.value }))}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="graduated">Graduated</option>
            <option value="suspended">Suspended</option>
            <option value="transferred">Transferred</option>
          </select>
          <input
            className="input-field"
            type="number"
            min={1}
            value={form.currentYear}
            onChange={(event) => setForm((previous) => ({ ...previous, currentYear: event.target.value }))}
            placeholder="Current year"
          />
          <input
            className="input-field"
            type="number"
            min={1}
            value={form.currentSemester}
            onChange={(event) => setForm((previous) => ({ ...previous, currentSemester: event.target.value }))}
            placeholder="Current semester"
          />
          <input
            className="input-field"
            placeholder="Guardian name"
            value={form.guardianName}
            onChange={(event) => setForm((previous) => ({ ...previous, guardianName: event.target.value }))}
          />
          <input
            className="input-field"
            placeholder="Guardian phone"
            value={form.guardianPhone}
            onChange={(event) => setForm((previous) => ({ ...previous, guardianPhone: event.target.value }))}
          />
          <input
            className="input-field"
            type="email"
            placeholder="Guardian email"
            value={form.guardianEmail}
            onChange={(event) => setForm((previous) => ({ ...previous, guardianEmail: event.target.value }))}
          />
          <input
            className="input-field"
            placeholder="Blood group"
            value={form.bloodGroup}
            onChange={(event) => setForm((previous) => ({ ...previous, bloodGroup: event.target.value }))}
          />

          <div className="md:col-span-2 flex gap-2">
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Student' : 'Create Student'}
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
        <h3 className="text-base font-semibold text-slate-900">Students</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="table-header">Student</th>
                <th className="table-header">Student ID</th>
                <th className="table-header">Department</th>
                <th className="table-header">Year/Semester</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && students.map((student) => (
                <tr key={student.id}>
                  <td className="table-cell">
                    <p className="font-medium text-slate-800">
                      {student.user?.firstName} {student.user?.lastName}
                    </p>
                    <p className="text-xs text-slate-500">{student.user?.email}</p>
                  </td>
                  <td className="table-cell">{student.studentId}</td>
                  <td className="table-cell">{student.department?.name || 'N/A'}</td>
                  <td className="table-cell">
                    Y{student.currentYear} / S{student.currentSemester}
                  </td>
                  <td className="table-cell">
                    <span className={student.status === 'active' ? 'badge-green' : 'badge-red'}>
                      {student.status}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="btn-primary py-1.5 px-3 text-xs"
                        onClick={() => startEdit(student)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-danger py-1.5 px-3 text-xs"
                        onClick={() => handleDelete(student)}
                        disabled={deletingId === student.id}
                      >
                        {deletingId === student.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && students.length === 0 && (
                <tr>
                  <td className="table-cell text-center text-slate-500" colSpan={6}>
                    No students found.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="table-cell text-center text-slate-500" colSpan={6}>
                    Loading students...
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
