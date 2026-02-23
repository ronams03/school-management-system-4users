import React, { useEffect, useState } from 'react';
import API from '../../api/axios';

const DEFAULT_FORM = {
  studentId: '',
  courseId: '',
  academicYearId: '',
  year: 1,
  semester: 1,
  status: 'enrolled',
  grade: '',
};

export default function EnrollmentManager() {
  const [enrollments, setEnrollments] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [enrollmentResponse, studentsResponse, coursesResponse, yearResponse] = await Promise.all([
        API.get('/enrollment', { params: { limit: 300 } }),
        API.get('/students', { params: { limit: 300 } }),
        API.get('/courses', { params: { limit: 300, active: true } }),
        API.get('/academic/years'),
      ]);

      setEnrollments(enrollmentResponse?.data?.data?.enrollments || []);
      setStudents(studentsResponse?.data?.data?.students || []);
      setCourses(coursesResponse?.data?.data?.courses || []);
      setAcademicYears(yearResponse?.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load enrollment data');
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
        studentId: form.studentId,
        courseId: form.courseId,
        academicYearId: form.academicYearId || null,
        year: Number(form.year) || 1,
        semester: Number(form.semester) || 1,
        status: form.status,
        grade: form.grade.trim(),
      };

      if (editingId) {
        await API.put(`/enrollment/${editingId}`, payload);
      } else {
        await API.post('/enrollment', payload);
      }

      resetForm();
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save enrollment');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (enrollment) => {
    setEditingId(enrollment.id);
    setForm({
      studentId: enrollment.studentId || '',
      courseId: enrollment.courseId || '',
      academicYearId: enrollment.academicYearId || '',
      year: enrollment.year || 1,
      semester: enrollment.semester || 1,
      status: enrollment.status || 'enrolled',
      grade: enrollment.grade || '',
    });
  };

  const dropEnrollment = async (enrollmentId) => {
    setError('');
    try {
      await API.delete(`/enrollment/${enrollmentId}`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to drop enrollment');
    }
  };

  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="text-xl font-semibold text-slate-900">Enrollment Management</h2>
        <p className="mt-1 text-sm text-slate-600">Enroll students in courses and update grade/status information.</p>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="card">
        <h3 className="text-base font-semibold text-slate-900">
          {editingId ? 'Update Enrollment' : 'Create Enrollment'}
        </h3>
        <form className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <select
            className="input-field"
            value={form.studentId}
            onChange={(event) => setForm((previous) => ({ ...previous, studentId: event.target.value }))}
            required
          >
            <option value="">Select student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.studentId} - {student.user?.firstName} {student.user?.lastName}
              </option>
            ))}
          </select>

          <select
            className="input-field"
            value={form.courseId}
            onChange={(event) => setForm((previous) => ({ ...previous, courseId: event.target.value }))}
            required
          >
            <option value="">Select course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} - {course.name}
              </option>
            ))}
          </select>

          <select
            className="input-field"
            value={form.academicYearId}
            onChange={(event) => setForm((previous) => ({ ...previous, academicYearId: event.target.value }))}
          >
            <option value="">Current academic year</option>
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>

          <select
            className="input-field"
            value={form.status}
            onChange={(event) => setForm((previous) => ({ ...previous, status: event.target.value }))}
          >
            <option value="enrolled">Enrolled</option>
            <option value="dropped">Dropped</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
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
            placeholder="Grade (optional)"
            value={form.grade}
            onChange={(event) => setForm((previous) => ({ ...previous, grade: event.target.value }))}
          />

          <div className="md:col-span-2 flex gap-2">
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Enrollment' : 'Create Enrollment'}
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
        <h3 className="text-base font-semibold text-slate-900">Enrollments</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="table-header">Student</th>
                <th className="table-header">Course</th>
                <th className="table-header">Year/Semester</th>
                <th className="table-header">Academic Year</th>
                <th className="table-header">Status</th>
                <th className="table-header">Grade</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && enrollments.map((enrollment) => (
                <tr key={enrollment.id}>
                  <td className="table-cell">
                    {enrollment.student?.studentId} - {enrollment.student?.user?.firstName} {enrollment.student?.user?.lastName}
                  </td>
                  <td className="table-cell">
                    {enrollment.course?.code} - {enrollment.course?.name}
                  </td>
                  <td className="table-cell">
                    Y{enrollment.year} / S{enrollment.semester}
                  </td>
                  <td className="table-cell">{enrollment.academicYear?.name || 'N/A'}</td>
                  <td className="table-cell">
                    <span className={enrollment.status === 'enrolled' ? 'badge-green' : 'badge-red'}>
                      {enrollment.status}
                    </span>
                  </td>
                  <td className="table-cell">{enrollment.grade || '-'}</td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button type="button" className="btn-primary py-1.5 px-3 text-xs" onClick={() => startEdit(enrollment)}>
                        Edit
                      </button>
                      {enrollment.status === 'enrolled' && (
                        <button
                          type="button"
                          className="btn-danger py-1.5 px-3 text-xs"
                          onClick={() => dropEnrollment(enrollment.id)}
                        >
                          Drop
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && enrollments.length === 0 && (
                <tr>
                  <td className="table-cell text-center text-slate-500" colSpan={7}>
                    No enrollments found.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="table-cell text-center text-slate-500" colSpan={7}>
                    Loading enrollments...
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
