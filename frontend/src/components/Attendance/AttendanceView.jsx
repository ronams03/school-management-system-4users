import React, { useEffect, useMemo, useState } from 'react';
import API from '../../api/axios';
import { getUserPermissions } from '../../config/navigation';
import { useAuth } from '../../hooks/useAuth';

const DEFAULT_FORM = {
  studentId: '',
  courseId: '',
  attendanceDate: new Date().toISOString().slice(0, 10),
  status: 'present',
  remarks: '',
  eyeScanVerified: false,
};

export default function AttendanceView() {
  const { user } = useAuth();
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    attendanceDate: '',
    course: '',
    status: '',
  });
  const [form, setForm] = useState(DEFAULT_FORM);

  const userPermissions = useMemo(() => getUserPermissions(user), [user]);
  const canMarkAttendance = userPermissions.includes('take_attendance');
  const canViewAttendanceSummary = userPermissions.some((permission) =>
    ['take_attendance', 'view_attendance', 'view_reports'].includes(permission)
  );

  const deriveCoursesFromAttendance = (records = []) => {
    const mappedCourses = records.map((record) => record.course).filter(Boolean);
    const seen = new Set();
    return mappedCourses.filter((course) => {
      if (!course?.id || seen.has(course.id)) {
        return false;
      }
      seen.add(course.id);
      return true;
    });
  };

  const fetchAttendance = async (nextFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const query = {
        limit: 300,
        attendanceDate: nextFilters.attendanceDate || undefined,
        course: nextFilters.course || undefined,
        status: nextFilters.status || undefined,
      };

      const [attendanceResponse, studentResponse, courseResponse, summaryResponse] = await Promise.all([
        API.get('/attendance', { params: query }),
        canMarkAttendance
          ? API.get('/students', { params: { limit: 300 } })
          : Promise.resolve(null),
        canMarkAttendance || canViewAttendanceSummary
          ? API.get('/courses', { params: { limit: 300, active: true } })
          : Promise.resolve(null),
        canViewAttendanceSummary
          ? API.get('/attendance/summary', { params: query })
          : Promise.resolve(null),
      ]);

      const nextRows = attendanceResponse?.data?.data?.attendance || [];
      const courseList = courseResponse?.data?.data?.courses || [];

      setAttendanceRows(nextRows);
      setStudents(studentResponse?.data?.data?.students || []);
      setCourses(courseList.length > 0 ? courseList : deriveCoursesFromAttendance(nextRows));
      setSummary(summaryResponse?.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handleMarkAttendance = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      await API.post('/attendance/mark', {
        studentId: form.studentId,
        courseId: form.courseId,
        attendanceDate: form.attendanceDate,
        status: form.status,
        remarks: form.remarks.trim(),
        eyeScanVerified: Boolean(form.eyeScanVerified),
      });

      setForm(DEFAULT_FORM);
      await fetchAttendance();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="text-xl font-semibold text-slate-900">
          {canMarkAttendance ? 'Attendance Management' : 'My Attendance'}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {canMarkAttendance
            ? 'Record attendance and monitor presence trends in real time.'
            : 'Review your attendance records and filter by date, course, or status.'}
        </p>
      </section>

      {summary && (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="card py-4">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-2xl font-semibold text-slate-900">{summary.total ?? 0}</p>
          </div>
          <div className="card py-4">
            <p className="text-xs text-slate-500">Present</p>
            <p className="text-2xl font-semibold text-emerald-600">{summary.present ?? 0}</p>
          </div>
          <div className="card py-4">
            <p className="text-xs text-slate-500">Absent</p>
            <p className="text-2xl font-semibold text-red-600">{summary.absent ?? 0}</p>
          </div>
          <div className="card py-4">
            <p className="text-xs text-slate-500">Late</p>
            <p className="text-2xl font-semibold text-amber-600">{summary.late ?? 0}</p>
          </div>
          <div className="card py-4">
            <p className="text-xs text-slate-500">Present Rate</p>
            <p className="text-2xl font-semibold text-slate-900">{summary.presentRate ?? 0}%</p>
          </div>
        </section>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {canMarkAttendance && (
        <section className="card">
          <h3 className="text-base font-semibold text-slate-900">Mark Attendance</h3>
          <form className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleMarkAttendance}>
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
            <input
              className="input-field"
              type="date"
              value={form.attendanceDate}
              onChange={(event) => setForm((previous) => ({ ...previous, attendanceDate: event.target.value }))}
              required
            />
            <select
              className="input-field"
              value={form.status}
              onChange={(event) => setForm((previous) => ({ ...previous, status: event.target.value }))}
            >
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="excused">Excused</option>
            </select>
            <input
              className="input-field md:col-span-2"
              placeholder="Remarks (optional)"
              value={form.remarks}
              onChange={(event) => setForm((previous) => ({ ...previous, remarks: event.target.value }))}
            />
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(form.eyeScanVerified)}
                onChange={(event) => setForm((previous) => ({ ...previous, eyeScanVerified: event.target.checked }))}
              />
              Verified with eye scan
            </label>

            <div className="md:col-span-2">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Mark Attendance'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <h3 className="text-base font-semibold text-slate-900">Attendance Records</h3>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="input-field"
              type="date"
              value={filters.attendanceDate}
              onChange={(event) => setFilters((previous) => ({ ...previous, attendanceDate: event.target.value }))}
            />
            <select
              className="input-field"
              value={filters.course}
              onChange={(event) => setFilters((previous) => ({ ...previous, course: event.target.value }))}
            >
              <option value="">All courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code}
                </option>
              ))}
            </select>
            <select
              className="input-field"
              value={filters.status}
              onChange={(event) => setFilters((previous) => ({ ...previous, status: event.target.value }))}
            >
              <option value="">All statuses</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="excused">Excused</option>
            </select>
            <button type="button" className="btn-primary" onClick={() => fetchAttendance(filters)}>
              Apply
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="table-header">Date</th>
                <th className="table-header">Student</th>
                <th className="table-header">Course</th>
                <th className="table-header">Status</th>
                <th className="table-header">Eye Scan</th>
                <th className="table-header">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && attendanceRows.map((row) => (
                <tr key={row.id}>
                  <td className="table-cell">{row.attendanceDate}</td>
                  <td className="table-cell">
                    {row.student?.studentId} - {row.student?.user?.firstName} {row.student?.user?.lastName}
                  </td>
                  <td className="table-cell">{row.course?.code} - {row.course?.name}</td>
                  <td className="table-cell">
                    <span className={row.status === 'present' ? 'badge-green' : 'badge-red'}>
                      {row.status}
                    </span>
                  </td>
                  <td className="table-cell">
                    {row.eyeScanVerified ? (
                      <span className="badge-green">Verified</span>
                    ) : (
                      <span className="badge-blue">Manual</span>
                    )}
                  </td>
                  <td className="table-cell">{row.remarks || '-'}</td>
                </tr>
              ))}
              {!loading && attendanceRows.length === 0 && (
                <tr>
                  <td className="table-cell text-center text-slate-500" colSpan={6}>
                    No attendance rows found.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="table-cell text-center text-slate-500" colSpan={6}>
                    Loading attendance...
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
