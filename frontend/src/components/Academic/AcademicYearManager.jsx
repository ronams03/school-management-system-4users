import React, { useEffect, useState } from 'react';
import API from '../../api/axios';

const DEFAULT_FORM = {
  name: '',
  startDate: '',
  endDate: '',
  isCurrent: false,
  isActive: true,
};

export default function AcademicYearManager() {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  const fetchYears = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await API.get('/academic/years');
      setYears(data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load academic years');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYears();
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
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        isCurrent: Boolean(form.isCurrent),
        isActive: Boolean(form.isActive),
      };

      if (editingId) {
        await API.put(`/academic/years/${editingId}`, payload);
      } else {
        await API.post('/academic/years', payload);
      }

      resetForm();
      await fetchYears();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save academic year');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (year) => {
    setEditingId(year.id);
    setForm({
      name: year.name || '',
      startDate: year.startDate ? String(year.startDate).slice(0, 10) : '',
      endDate: year.endDate ? String(year.endDate).slice(0, 10) : '',
      isCurrent: Boolean(year.isCurrent),
      isActive: Boolean(year.isActive),
    });
  };

  const setCurrent = async (yearId) => {
    setError('');
    try {
      await API.post(`/academic/years/${yearId}/set-current`);
      await fetchYears();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set current academic year');
    }
  };

  const archive = async (yearId) => {
    setError('');
    try {
      await API.delete(`/academic/years/${yearId}`);
      await fetchYears();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to archive academic year');
    }
  };

  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="text-xl font-semibold text-slate-900">Academic Year Management</h2>
        <p className="mt-1 text-sm text-slate-600">Configure the active academic calendar for enrollment and attendance.</p>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="card">
        <h3 className="text-base font-semibold text-slate-900">
          {editingId ? 'Update Academic Year' : 'Create Academic Year'}
        </h3>
        <form className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <input
            className="input-field"
            placeholder="e.g. 2025-2026"
            value={form.name}
            onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
            required
          />
          <input
            className="input-field"
            type="date"
            value={form.startDate}
            onChange={(event) => setForm((previous) => ({ ...previous, startDate: event.target.value }))}
          />
          <input
            className="input-field"
            type="date"
            value={form.endDate}
            onChange={(event) => setForm((previous) => ({ ...previous, endDate: event.target.value }))}
          />
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(form.isCurrent)}
                onChange={(event) => setForm((previous) => ({ ...previous, isCurrent: event.target.checked }))}
              />
              Set as current
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(form.isActive)}
                onChange={(event) => setForm((previous) => ({ ...previous, isActive: event.target.checked }))}
              />
              Active
            </label>
          </div>

          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Academic Year' : 'Create Academic Year'}
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
        <h3 className="text-base font-semibold text-slate-900">Academic Years</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="table-header">Name</th>
                <th className="table-header">Start Date</th>
                <th className="table-header">End Date</th>
                <th className="table-header">Current</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && years.map((year) => (
                <tr key={year.id}>
                  <td className="table-cell">{year.name}</td>
                  <td className="table-cell">{year.startDate || 'N/A'}</td>
                  <td className="table-cell">{year.endDate || 'N/A'}</td>
                  <td className="table-cell">
                    {year.isCurrent ? <span className="badge-green">Current</span> : <span className="badge-blue">No</span>}
                  </td>
                  <td className="table-cell">
                    <span className={year.isActive ? 'badge-green' : 'badge-red'}>
                      {year.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn-primary py-1.5 px-3 text-xs" onClick={() => startEdit(year)}>
                        Edit
                      </button>
                      {!year.isCurrent && (
                        <button type="button" className="btn-primary py-1.5 px-3 text-xs" onClick={() => setCurrent(year.id)}>
                          Set Current
                        </button>
                      )}
                      {year.isActive && (
                        <button type="button" className="btn-danger py-1.5 px-3 text-xs" onClick={() => archive(year.id)}>
                          Archive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && years.length === 0 && (
                <tr>
                  <td className="table-cell text-center text-slate-500" colSpan={6}>
                    No academic years found.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="table-cell text-center text-slate-500" colSpan={6}>
                    Loading academic years...
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
