import React, { useEffect, useMemo, useState } from 'react';
import API from '../../api/axios';

export default function ReportsCenter() {
  const [overview, setOverview] = useState(null);
  const [departmentReport, setDepartmentReport] = useState([]);
  const [trend, setTrend] = useState([]);
  const [eyeScanUsage, setEyeScanUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const [overviewResponse, departmentResponse, trendResponse, eyeResponse] = await Promise.all([
        API.get('/reports/overview'),
        API.get('/reports/department-enrollment'),
        API.get('/reports/attendance-trend', { params: { days: 14 } }),
        API.get('/reports/eye-scan-usage'),
      ]);

      setOverview(overviewResponse?.data?.data || null);
      setDepartmentReport(departmentResponse?.data?.data || []);
      setTrend(trendResponse?.data?.data || []);
      setEyeScanUsage(eyeResponse?.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const trendMax = useMemo(() => {
    if (trend.length === 0) return 1;
    return Math.max(...trend.map((item) => item.total || 0), 1);
  }, [trend]);

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Reports & Analytics</h2>
            <p className="mt-1 text-sm text-slate-600">Operational metrics across users, attendance, enrollment, and biometrics.</p>
          </div>
          <button type="button" className="btn-primary" onClick={fetchReports}>
            Refresh
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {overview && (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          <div className="card py-4">
            <p className="text-xs text-slate-500">Students</p>
            <p className="text-2xl font-semibold text-slate-900">{overview.cards?.activeStudents ?? 0}</p>
          </div>
          <div className="card py-4">
            <p className="text-xs text-slate-500">Teachers</p>
            <p className="text-2xl font-semibold text-slate-900">{overview.cards?.activeTeachers ?? 0}</p>
          </div>
          <div className="card py-4">
            <p className="text-xs text-slate-500">Departments</p>
            <p className="text-2xl font-semibold text-slate-900">{overview.cards?.activeDepartments ?? 0}</p>
          </div>
          <div className="card py-4">
            <p className="text-xs text-slate-500">Courses</p>
            <p className="text-2xl font-semibold text-slate-900">{overview.cards?.activeCourses ?? 0}</p>
          </div>
          <div className="card py-4">
            <p className="text-xs text-slate-500">Enrollments</p>
            <p className="text-2xl font-semibold text-slate-900">{overview.cards?.activeEnrollments ?? 0}</p>
          </div>
          <div className="card py-4">
            <p className="text-xs text-slate-500">Today Attendance</p>
            <p className="text-2xl font-semibold text-slate-900">{overview.cards?.todayAttendance ?? 0}</p>
          </div>
          <div className="card py-4">
            <p className="text-xs text-slate-500">Eye Scans</p>
            <p className="text-2xl font-semibold text-slate-900">{overview.cards?.eyeScans ?? 0}</p>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card">
          <h3 className="text-base font-semibold text-slate-900">Attendance Trend (Last 14 Days)</h3>
          <div className="mt-4 space-y-2">
            {trend.map((item) => (
              <div key={item.date} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>{item.date}</span>
                  <span>{item.total} records</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-primary-500"
                    style={{ width: `${Math.max((item.total / trendMax) * 100, 3)}%` }}
                  />
                </div>
              </div>
            ))}
            {trend.length === 0 && !loading && (
              <p className="text-sm text-slate-500">No attendance trend data available.</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-base font-semibold text-slate-900">Eye Scan Usage</h3>
          {eyeScanUsage ? (
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>Total records: <span className="font-semibold">{eyeScanUsage.total}</span></p>
              <p>Active records: <span className="font-semibold">{eyeScanUsage.active}</span></p>
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-xs text-slate-500">Admins</p>
                  <p className="font-semibold">{eyeScanUsage.byRole?.admin ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">School Heads</p>
                  <p className="font-semibold">{eyeScanUsage.byRole?.school_head ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Teachers</p>
                  <p className="font-semibold">{eyeScanUsage.byRole?.teacher ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Students</p>
                  <p className="font-semibold">{eyeScanUsage.byRole?.student ?? 0}</p>
                </div>
              </div>
            </div>
          ) : (
            !loading && <p className="mt-3 text-sm text-slate-500">No eye scan data available.</p>
          )}
        </div>
      </section>

      <section className="card">
        <h3 className="text-base font-semibold text-slate-900">Department Enrollment Report</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="table-header">Department</th>
                <th className="table-header">Students</th>
                <th className="table-header">Teachers</th>
                <th className="table-header">Courses</th>
                <th className="table-header">Enrollments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && departmentReport.map((item) => (
                <tr key={item.id}>
                  <td className="table-cell">
                    {item.name} <span className="text-xs text-slate-500">({item.code})</span>
                  </td>
                  <td className="table-cell">{item.students}</td>
                  <td className="table-cell">{item.teachers}</td>
                  <td className="table-cell">{item.courses}</td>
                  <td className="table-cell">{item.enrollments}</td>
                </tr>
              ))}
              {!loading && departmentReport.length === 0 && (
                <tr>
                  <td className="table-cell text-center text-slate-500" colSpan={5}>
                    No report data available.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="table-cell text-center text-slate-500" colSpan={5}>
                    Loading reports...
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
