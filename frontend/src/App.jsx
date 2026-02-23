import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import API from './api/axios';
import Login from './components/Auth/Login';
import UserManager from './components/Admin/UserManager';
import AcademicYearManager from './components/Academic/AcademicYearManager';
import AttendanceView from './components/Attendance/AttendanceView';
import CourseList from './components/Courses/CourseList';
import DepartmentManager from './components/Departments/DepartmentManager';
import EnrollmentManager from './components/Enrollment/EnrollmentManager';
import EyeScanEnroll from './components/EyeScanner/EyeScanEnroll';
import ProtectedRoute from './components/Common/ProtectedRoute';
import MainLayout from './components/Layout/MainLayout';
import ReportsCenter from './components/Reports/ReportsCenter';
import MyCourses from './components/Students/MyCourses';
import StudentList from './components/Students/StudentList';
import StudentPromotion from './components/Students/StudentPromotion';
import TeacherList from './components/Teachers/TeacherList';
import { useAuth } from './hooks/useAuth';
import { canAccessItem, getUserPermissions, getVisibleNavItems } from './config/navigation';

function PermissionDenied({ requiredPermissions = [] }) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-slate-900">Access Restricted</h2>
      <p className="mt-2 text-sm text-slate-600">
        You do not have permission to open this section.
      </p>
      {requiredPermissions.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Required Permissions</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {requiredPermissions.map((permission) => (
              <span key={permission} className="badge-red">
                {permission}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PermissionGate({ requiredPermissions = [], children }) {
  const { user } = useAuth();
  const userPermissions = useMemo(() => getUserPermissions(user), [user]);
  const allowed = canAccessItem(userPermissions, requiredPermissions);

  if (!allowed) {
    return <PermissionDenied requiredPermissions={requiredPermissions} />;
  }

  return children;
}

function DashboardHome() {
  const { user } = useAuth();
  const userPermissions = useMemo(() => getUserPermissions(user), [user]);
  const [stats, setStats] = useState(null);

  const canViewAdminStats = useMemo(
    () => userPermissions.includes('manage_users') || userPermissions.includes('view_reports'),
    [userPermissions]
  );

  useEffect(() => {
    let mounted = true;
    if (!canViewAdminStats) {
      setStats(null);
      return () => {
        mounted = false;
      };
    }

    API.get('/admin/stats')
      .then((response) => {
        if (mounted) {
          setStats(response?.data?.data || null);
        }
      })
      .catch(() => {
        if (mounted) {
          setStats(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, [canViewAdminStats]);

  const modules = useMemo(
    () => getVisibleNavItems(userPermissions).filter((item) => item.path !== '/dashboard'),
    [userPermissions]
  );

  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="text-xl font-semibold text-slate-900">Welcome Back</h2>
        <p className="mt-2 text-sm text-slate-600">
          Logged in as <span className="font-medium">{user?.firstName} {user?.lastName}</span> ({user?.role}).
          Use the app drawer to open your modules.
        </p>
      </section>

      <section className="card">
        <h3 className="text-base font-semibold text-slate-900">Permissions</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {userPermissions.length > 0 ? (
            userPermissions.map((permission) => (
              <span key={permission} className="badge-blue">
                {permission}
              </span>
            ))
          ) : (
            <p className="text-sm text-slate-500">No explicit permissions found for this account.</p>
          )}
        </div>
      </section>

      {stats && (
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="card py-4">
            <p className="text-xs text-slate-500">Users</p>
            <p className="text-2xl font-semibold text-slate-900">{stats.users}</p>
          </div>
          <div className="card py-4">
            <p className="text-xs text-slate-500">Students</p>
            <p className="text-2xl font-semibold text-slate-900">{stats.students}</p>
          </div>
          <div className="card py-4">
            <p className="text-xs text-slate-500">Teachers</p>
            <p className="text-2xl font-semibold text-slate-900">{stats.teachers}</p>
          </div>
          <div className="card py-4">
            <p className="text-xs text-slate-500">Active Enrollments</p>
            <p className="text-2xl font-semibold text-slate-900">{stats.enrollments}</p>
          </div>
        </section>
      )}

      <section className="card">
        <h3 className="text-base font-semibold text-slate-900">Available Modules</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {modules.map((module) => (
            <div key={module.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{module.title}</p>
              <p className="mt-1 text-xs text-slate-600">{module.description}</p>
            </div>
          ))}
          {modules.length === 0 && (
            <p className="text-sm text-slate-500">No modules available for this role.</p>
          )}
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
      <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardHome />} />

          <Route
            path="/users"
            element={(
              <PermissionGate requiredPermissions={['manage_users']}>
                <UserManager />
              </PermissionGate>
            )}
          />

          <Route
            path="/students"
            element={(
              <PermissionGate requiredPermissions={['manage_students']}>
                <StudentList />
              </PermissionGate>
            )}
          />

          <Route
            path="/teachers"
            element={(
              <PermissionGate requiredPermissions={['manage_teachers']}>
                <TeacherList />
              </PermissionGate>
            )}
          />

          <Route
            path="/courses"
            element={(
              <PermissionGate requiredPermissions={['manage_courses']}>
                <CourseList />
              </PermissionGate>
            )}
          />

          <Route
            path="/enrollment"
            element={(
              <PermissionGate requiredPermissions={['manage_enrollment']}>
                <EnrollmentManager />
              </PermissionGate>
            )}
          />

          <Route
            path="/attendance"
            element={(
              <PermissionGate requiredPermissions={['take_attendance', 'view_attendance', 'view_own_attend']}>
                <AttendanceView />
              </PermissionGate>
            )}
          />

          <Route
            path="/my-courses"
            element={(
              <PermissionGate requiredPermissions={['view_own_courses']}>
                <MyCourses />
              </PermissionGate>
            )}
          />

          <Route
            path="/eye-scans"
            element={(
              <PermissionGate requiredPermissions={['manage_eye_scans']}>
                <EyeScanEnroll />
              </PermissionGate>
            )}
          />

          <Route
            path="/promotions"
            element={(
              <PermissionGate requiredPermissions={['promote_students']}>
                <StudentPromotion />
              </PermissionGate>
            )}
          />

          <Route
            path="/reports"
            element={(
              <PermissionGate requiredPermissions={['view_reports']}>
                <ReportsCenter />
              </PermissionGate>
            )}
          />

          <Route
            path="/departments"
            element={(
              <PermissionGate requiredPermissions={['manage_departments']}>
                <DepartmentManager />
              </PermissionGate>
            )}
          />

          <Route
            path="/academic-year"
            element={(
              <PermissionGate requiredPermissions={['manage_acad_year']}>
                <AcademicYearManager />
              </PermissionGate>
            )}
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
