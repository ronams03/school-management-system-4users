import React, { useEffect, useMemo, useState } from 'react';
import API from '../../api/axios';

const DEFAULT_FILTERS = {
  status: '',
  year: '',
  semester: '',
};

const STATUS_CLASSNAME = {
  enrolled: 'badge-green',
  completed: 'badge-blue',
  dropped: 'badge-red',
  failed: 'badge-red',
};

export default function MyCourses() {
  const [enrollments, setEnrollments] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 0 });
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEnrollments = async (nextFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await API.get('/enrollment/my', {
        params: {
          limit: 300,
          status: nextFilters.status || undefined,
          year: nextFilters.year || undefined,
          semester: nextFilters.semester || undefined,
        },
      });

      setEnrollments(data?.data?.enrollments || []);
      setPagination(data?.data?.pagination || { total: 0, page: 1, pages: 0 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load enrolled courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const summary = useMemo(() => {
    return enrollments.reduce(
      (accumulator, enrollment) => {
        accumulator.total += 1;
        if (enrollment.status === 'enrolled') accumulator.enrolled += 1;
        if (enrollment.status === 'completed') accumulator.completed += 1;
        if (enrollment.status === 'failed') accumulator.failed += 1;
        return accumulator;
      },
      { total: 0, enrolled: 0, completed: 0, failed: 0 }
    );
  }, [enrollments]);

  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="text-xl font-semibold text-slate-900">My Courses</h2>
        <p className="mt-1 text-sm text-slate-600">
          View your enrolled courses, statuses, grades, and semester progress.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card py-4">
          <p className="text-xs text-slate-500">Total Courses</p>
          <p className="text-2xl font-semibold text-slate-900">{summary.total}</p>
        </div>
        <div className="card py-4">
          <p className="text-xs text-slate-500">Enrolled</p>
          <p className="text-2xl font-semibold text-emerald-600">{summary.enrolled}</p>
        </div>
        <div className="card py-4">
          <p className="text-xs text-slate-500">Completed</p>
          <p className="text-2xl font-semibold text-sky-600">{summary.completed}</p>
        </div>
        <div className="card py-4">
          <p className="text-xs text-slate-500">Failed</p>
          <p className="text-2xl font-semibold text-red-600">{summary.failed}</p>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="card">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <h3 className="text-base font-semibold text-slate-900">Enrollment Records</h3>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              className="input-field"
              value={filters.status}
              onChange={(event) => setFilters((previous) => ({ ...previous, status: event.target.value }))}
            >
              <option value="">All statuses</option>
              <option value="enrolled">Enrolled</option>
              <option value="completed">Completed</option>
              <option value="dropped">Dropped</option>
              <option value="failed">Failed</option>
            </select>
            <input
              className="input-field"
              type="number"
              min={1}
              value={filters.year}
              onChange={(event) => setFilters((previous) => ({ ...previous, year: event.target.value }))}
              placeholder="Year"
            />
            <input
              className="input-field"
              type="number"
              min={1}
              value={filters.semester}
              onChange={(event) => setFilters((previous) => ({ ...previous, semester: event.target.value }))}
              placeholder="Semester"
            />
            <button type="button" className="btn-primary" onClick={() => fetchEnrollments(filters)}>
              Apply
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={() => {
                setFilters(DEFAULT_FILTERS);
                fetchEnrollments(DEFAULT_FILTERS);
              }}
            >
              Reset
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          {pagination.total} record{pagination.total === 1 ? '' : 's'} found
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="table-header">Course</th>
                <th className="table-header">Department</th>
                <th className="table-header">Teacher</th>
                <th className="table-header">Year/Semester</th>
                <th className="table-header">Status</th>
                <th className="table-header">Grade</th>
                <th className="table-header">Enrollment Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && enrollments.map((enrollment) => (
                <tr key={enrollment.id}>
                  <td className="table-cell">
                    <p className="font-medium text-slate-800">
                      {enrollment.course?.code} - {enrollment.course?.name}
                    </p>
                  </td>
                  <td className="table-cell">{enrollment.course?.department?.name || 'N/A'}</td>
                  <td className="table-cell">
                    {enrollment.course?.teacher?.user
                      ? `${enrollment.course.teacher.user.firstName} ${enrollment.course.teacher.user.lastName}`
                      : 'N/A'}
                  </td>
                  <td className="table-cell">Y{enrollment.year} / S{enrollment.semester}</td>
                  <td className="table-cell">
                    <span className={STATUS_CLASSNAME[enrollment.status] || 'badge-blue'}>
                      {enrollment.status}
                    </span>
                  </td>
                  <td className="table-cell">{enrollment.grade || '-'}</td>
                  <td className="table-cell">
                    {enrollment.enrollmentDate ? String(enrollment.enrollmentDate).slice(0, 10) : '-'}
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
