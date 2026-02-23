import {
  HiOutlineAcademicCap,
  HiOutlineBookOpen,
  HiOutlineCalendar,
  HiOutlineChartBar,
  HiOutlineClipboardList,
  HiOutlineCollection,
  HiOutlineEye,
  HiOutlineHome,
  HiOutlineUserGroup,
  HiOutlineUsers,
} from 'react-icons/hi';

const ROLE_DEFAULT_PERMISSIONS = Object.freeze({
  admin: [
    'manage_users',
    'manage_students',
    'manage_teachers',
    'manage_courses',
    'manage_enrollment',
    'take_attendance',
    'view_attendance',
    'view_own_attend',
    'manage_eye_scans',
    'promote_students',
    'view_reports',
    'manage_departments',
    'manage_acad_year',
  ],
  school_head: [
    'manage_students',
    'manage_teachers',
    'manage_courses',
    'manage_enrollment',
    'take_attendance',
    'view_attendance',
    'view_own_attend',
    'manage_eye_scans',
    'promote_students',
    'view_reports',
    'manage_departments',
    'manage_acad_year',
  ],
  teacher: [
    'take_attendance',
    'view_attendance',
    'view_own_attend',
    'manage_eye_scans',
    'view_reports',
  ],
  student: [
    'view_own_attend',
    'view_own_courses',
  ],
});

export const NAV_ITEMS = [
  {
    key: 'dashboard',
    title: 'Dashboard',
    path: '/dashboard',
    icon: HiOutlineHome,
    description: 'Overview of your account and permissions.',
    permissions: [],
  },
  {
    key: 'users',
    title: 'Users',
    path: '/users',
    icon: HiOutlineUsers,
    description: 'Manage all platform user accounts and roles.',
    permissions: ['manage_users'],
  },
  {
    key: 'students',
    title: 'Students',
    path: '/students',
    icon: HiOutlineUsers,
    description: 'Manage student records and profiles.',
    permissions: ['manage_students'],
  },
  {
    key: 'teachers',
    title: 'Teachers',
    path: '/teachers',
    icon: HiOutlineUserGroup,
    description: 'Manage teacher accounts and assignments.',
    permissions: ['manage_teachers'],
  },
  {
    key: 'courses',
    title: 'Courses',
    path: '/courses',
    icon: HiOutlineBookOpen,
    description: 'Create and maintain course offerings.',
    permissions: ['manage_courses'],
  },
  {
    key: 'enrollment',
    title: 'Enrollment',
    path: '/enrollment',
    icon: HiOutlineCollection,
    description: 'Handle enrollment workflows and status.',
    permissions: ['manage_enrollment'],
  },
  {
    key: 'attendance',
    title: 'Attendance',
    path: '/attendance',
    icon: HiOutlineClipboardList,
    description: 'View and manage attendance data.',
    permissions: ['take_attendance', 'view_attendance', 'view_own_attend'],
  },
  {
    key: 'my-courses',
    title: 'My Courses',
    path: '/my-courses',
    icon: HiOutlineBookOpen,
    description: 'View your enrolled courses and progress.',
    permissions: ['view_own_courses'],
  },
  {
    key: 'eye-scans',
    title: 'Eye Scans',
    path: '/eye-scans',
    icon: HiOutlineEye,
    description: 'Enroll and monitor biometric eye scans.',
    permissions: ['manage_eye_scans'],
  },
  {
    key: 'promotions',
    title: 'Promotions',
    path: '/promotions',
    icon: HiOutlineAcademicCap,
    description: 'Promote students across year and semester.',
    permissions: ['promote_students'],
  },
  {
    key: 'reports',
    title: 'Reports',
    path: '/reports',
    icon: HiOutlineChartBar,
    description: 'Access analytics and reporting tools.',
    permissions: ['view_reports'],
  },
  {
    key: 'departments',
    title: 'Departments',
    path: '/departments',
    icon: HiOutlineUsers,
    description: 'Maintain academic departments.',
    permissions: ['manage_departments'],
  },
  {
    key: 'academic-year',
    title: 'Academic Year',
    path: '/academic-year',
    icon: HiOutlineCalendar,
    description: 'Configure current academic year settings.',
    permissions: ['manage_acad_year'],
  },
];

export const getUserPermissions = (user) => {
  if (!user) {
    return [];
  }

  const rolePermissions = Array.isArray(ROLE_DEFAULT_PERMISSIONS[user.role])
    ? ROLE_DEFAULT_PERMISSIONS[user.role]
    : [];
  const explicitPermissions = Array.isArray(user.permissions) ? user.permissions : [];

  return [...new Set([...rolePermissions, ...explicitPermissions])];
};

export const canAccessItem = (userPermissions, requiredPermissions = []) => {
  if (!Array.isArray(requiredPermissions) || requiredPermissions.length === 0) {
    return true;
  }

  if (!Array.isArray(userPermissions) || userPermissions.length === 0) {
    return false;
  }

  return requiredPermissions.some((permission) => userPermissions.includes(permission));
};

export const getVisibleNavItems = (userPermissions) =>
  NAV_ITEMS.filter((item) => canAccessItem(userPermissions, item.permissions));
