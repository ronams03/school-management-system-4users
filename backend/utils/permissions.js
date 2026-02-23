export const ROLES = Object.freeze([
  'admin',
  'school_head',
  'teacher',
  'student',
]);

export const RBAC_PERMISSION_MATRIX = Object.freeze({
  admin: Object.freeze([
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
  ]),
  school_head: Object.freeze([
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
  ]),
  teacher: Object.freeze([
    'take_attendance',
    'view_attendance',
    'view_own_attend',
    'manage_eye_scans',
    'view_reports',
  ]),
  student: Object.freeze([
    'view_own_attend',
    'view_own_courses',
  ]),
});

// Keep compatibility with older permission keys already used in parts of the codebase.
const LEGACY_PERMISSION_MAP = Object.freeze({
  view_own_attendance: ['view_own_attend'],
  manage_academic_year: ['manage_acad_year'],
  manage_attendance: ['take_attendance', 'view_attendance'],
});

const LEGACY_PERMISSION_KEYS = Object.freeze([
  ...Object.keys(LEGACY_PERMISSION_MAP),
  'view_own_courses',
]);

export const MATRIX_PERMISSIONS = Object.freeze(
  [...new Set(Object.values(RBAC_PERMISSION_MATRIX).flat())]
);

export const USER_PERMISSION_ENUM = Object.freeze(
  [...new Set([...MATRIX_PERMISSIONS, ...LEGACY_PERMISSION_KEYS])]
);

export const getRolePermissions = (role) => {
  const permissions = RBAC_PERMISSION_MATRIX[role];
  return permissions ? [...permissions] : [];
};

export const normalizePermissionList = (permissions = []) => {
  const normalized = new Set();

  for (const permission of permissions) {
    if (!permission) {
      continue;
    }

    const mappedPermissions = LEGACY_PERMISSION_MAP[permission];
    if (Array.isArray(mappedPermissions)) {
      mappedPermissions.forEach((mapped) => normalized.add(mapped));
      continue;
    }

    normalized.add(permission);
  }

  return [...normalized];
};

export const resolveUserPermissions = (user) => {
  const explicitPermissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const rolePermissions = getRolePermissions(user?.role);
  if (explicitPermissions.length === 0) {
    return normalizePermissionList(rolePermissions);
  }

  return normalizePermissionList([...rolePermissions, ...explicitPermissions]);
};
