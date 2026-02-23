import React, { useEffect, useState } from 'react';
import API from '../../api/axios';

const DEFAULT_FORM = {
  code: '',
  name: '',
  description: '',
  departmentId: '',
  year: 1,
  semester: 1,
  credits: 0,
  teacherId: '',
  isActive: true,
};

export default function CourseList() {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(DEFAULT_FORM);

  const fetchData = async (searchTerm = '') => {
    setLoading(true);
    setError('');
    try {
      const [courseResponse, departmentResponse, teacherResponse] = await Promise.all([
        API.get('/courses', {
          params: {
            limit: 300,
            search: searchTerm || undefined,
          },
        }),
        API.get('/departments', { params: { active: true } }),
        API.get('/teachers', { params: { limit: 300, active: true } }),
      ]);

      setCourses(courseResponse?.data?.data?.courses || []);
      setDepartments(departmentResponse?.data?.data || []);
      setTeachers(teacherResponse?.data?.data?.teachers || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim(),
        departmentId: form.departmentId || null,
        year: Number(form.year) || 1,
        semester: Number(form.semester) || 1,
        credits: Number(form.credits) || 0,
        teacherId: form.teacherId || null,
        isActive: Boolean(form.isActive),
      };

      if (editingId) {
        await API.put(`/courses/${editingId}`, payload);
      } else {
        await API.post('/courses', payload);
      }

      resetForm();
      await fetchData(search);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (course) => {
    setEditingId(course.id);
    setForm({
      code: course.code || '',
      name: course.name || '',
      description: course.description || '',
      departmentId: course.departmentId || '',
      year: course.year || 1,
      semester: course.semester || 1,
      credits: course.credits || 0,
      teacherId: course.teacherId || '',
      isActive: Boolean(course.isActive),
    });
  };

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Course Management</h2>
            <p className="mt-1 text-sm text-slate-600">Create and assign courses by department, year, and semester.</p>
          </div>
          <div className="flex gap-2">
            <input
              className="input-field min-w-[230px]"
              placeholder="Search courses"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button type="button" className="btn-primary" onClick={() => fetchData(search)}>
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
          {editingId ? 'Update Course' : 'Create Course'}
        </h3>
        <form className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <input
            className="input-field"
            placeholder="Course code"
            value={form.code}
            onChange={(event) => setForm((previous) => ({ ...previous, code: event.target.value }))}
            required
          />
          <input
            className="input-field"
            placeholder="Course name"
            value={form.name}
            onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
            required
          />
          <select
            className="input-field"
            value={form.departmentId}
            onChange={(event) => setForm((previous) => ({ ...previous, departmentId: event.target.value }))}
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
            value={form.teacherId}
            onChange={(event) => setForm((previous) => ({ ...previous, teacherId: event.target.value }))}
          >
            <option value="">No assigned teacher</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.user?.firstName} {teacher.user?.lastName}
              </option>
            ))}
          </select>
          <input
            className="input-field"
            type="number"
            min={1}
            value={form.year}
            onChange={(event) => setForm((previous) => ({ ...previous, year: event.target.value }))}
            placeholder="Year"
          />
          <input
            className="input-field"
            type="number"
            min={1}
            value={form.semester}
            onChange={(event) => setForm((previous) => ({ ...previous, semester: event.target.value }))}
            placeholder="Semester"
          />
          <input
            className="input-field"
            type="number"
            min={0}
            step={0.5}
            value={form.credits}
            onChange={(event) => setForm((previous) => ({ ...previous, credits: event.target.value }))}
            placeholder="Credits"
          />
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(form.isActive)}
              onChange={(event) => setForm((previous) => ({ ...previous, isActive: event.target.checked }))}
            />
            Active
          </label>
          <textarea
            className="input-field md:col-span-2 min-h-[90px]"
            placeholder="Description"
            value={form.description}
            onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
          />

          <div className="md:col-span-2 flex gap-2">
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Course' : 'Create Course'}
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
        <h3 className="text-base font-semibold text-slate-900">Courses</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="table-header">Code</th>
                <th className="table-header">Name</th>
                <th className="table-header">Department</th>
                <th className="table-header">Teacher</th>
                <th className="table-header">Year/Semester</th>
                <th className="table-header">Credits</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && courses.map((course) => (
                <tr key={course.id}>
                  <td className="table-cell">{course.code}</td>
                  <td className="table-cell">{course.name}</td>
                  <td className="table-cell">{course.department?.name || 'N/A'}</td>
                  <td className="table-cell">
                    {course.teacher?.user
                      ? `${course.teacher.user.firstName} ${course.teacher.user.lastName}`
                      : 'Unassigned'}
                  </td>
                  <td className="table-cell">
                    Y{course.year} / S{course.semester}
                  </td>
                  <td className="table-cell">{course.credits}</td>
                  <td className="table-cell">
                    <span className={course.isActive ? 'badge-green' : 'badge-red'}>
                      {course.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <button type="button" className="btn-primary py-1.5 px-3 text-xs" onClick={() => startEdit(course)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && courses.length === 0 && (
                <tr>
                  <td className="table-cell text-center text-slate-500" colSpan={8}>
                    No courses found.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="table-cell text-center text-slate-500" colSpan={8}>
                    Loading courses...
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
