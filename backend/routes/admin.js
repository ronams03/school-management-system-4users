import express from 'express';
import { Op } from 'sequelize';
import { authenticate } from '../middleware/auth.js';
import { hasPermission } from '../middleware/rbac.js';
import {
  Course,
  Department,
  Enrollment,
  EyeScan,
  Student,
  Teacher,
  User,
} from '../models/index.js';
import {
  ROLES,
  getRolePermissions,
  normalizePermissionList,
} from '../utils/permissions.js';

const router = express.Router();

const ensureAdminContinuity = async (targetUser, updates) => {
  const nextRole = updates.role ?? targetUser.role;
  const nextIsActive = updates.isActive ?? targetUser.isActive;
  const wouldRemoveAdminPrivileges = targetUser.role === 'admin'
    && (!nextIsActive || nextRole !== 'admin');

  if (!wouldRemoveAdminPrivileges) {
    return null;
  }

  const remainingActiveAdmins = await User.count({
    where: {
      role: 'admin',
      isActive: true,
      id: { [Op.ne]: targetUser.id },
    },
  });

  if (remainingActiveAdmins === 0) {
    return 'At least one active admin account must remain in the system';
  }

  return null;
};

router.get('/stats', authenticate, hasPermission('manage_users', 'view_reports'), async (_req, res) => {
  try {
    const [
      users,
      activeUsers,
      students,
      teachers,
      departments,
      courses,
      enrollments,
      eyeScans,
    ] = await Promise.all([
      User.count(),
      User.count({ where: { isActive: true } }),
      Student.count({ where: { status: 'active' } }),
      Teacher.count({ where: { isActive: true } }),
      Department.count({ where: { isActive: true } }),
      Course.count({ where: { isActive: true } }),
      Enrollment.count({ where: { status: 'enrolled' } }),
      EyeScan.count({ where: { isActive: true } }),
    ]);

    return res.json({
      success: true,
      data: {
        users,
        activeUsers,
        students,
        teachers,
        departments,
        courses,
        enrollments,
        eyeScans,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/users', authenticate, hasPermission('manage_users', 'manage_eye_scans'), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const where = {};
    const canManageUsers = Array.isArray(req.user.permissions)
      ? req.user.permissions.includes('manage_users')
      : false;

    if (!canManageUsers) {
      const manageableRoles = ['student', 'teacher'];
      if (role) {
        if (!manageableRoles.includes(role)) {
          return res.json({
            success: true,
            data: {
              users: [],
              pagination: { total: 0, page: 1, pages: 0 },
            },
          });
        }
        where.role = role;
      } else {
        where.role = { [Op.in]: manageableRoles };
      }
    } else if (role) {
      where.role = role;
    }

    if (search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const pageNumber = Number(page) > 0 ? Number(page) : 1;
    const pageLimit = Number(limit) > 0 ? Number(limit) : 20;

    const { count, rows } = await User.findAndCountAll({
      where,
      offset: (pageNumber - 1) * pageLimit,
      limit: pageLimit,
      order: [['createdAt', 'DESC']],
    });

    const users = rows.map((user) => user.toSafeJSON());

    return res.json({
      success: true,
      data: {
        users,
        pagination: {
          total: count,
          page: pageNumber,
          pages: Math.ceil(count / pageLimit),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/users/:id', authenticate, hasPermission('manage_users'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, data: user.toSafeJSON() });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/users', authenticate, hasPermission('manage_users'), async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      role,
      phone,
      address,
      avatar,
      isActive = true,
      permissions,
    } = req.body;

    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !firstName || !lastName || !role) {
      return res.status(400).json({
        success: false,
        message: 'email, firstName, lastName and role are required',
      });
    }

    if (!ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role value' });
    }

    const duplicateUser = await User.findOne({ where: { email: normalizedEmail } });
    if (duplicateUser) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const userPermissions = Array.isArray(permissions) && permissions.length > 0
      ? normalizePermissionList(permissions)
      : getRolePermissions(role);

    const user = await User.create({
      email: normalizedEmail,
      password: password || 'password123',
      firstName,
      lastName,
      role,
      phone: phone || '',
      address: address || '',
      avatar: avatar || '',
      isActive: Boolean(isActive),
      permissions: userPermissions,
    });

    return res.status(201).json({ success: true, data: user.toSafeJSON() });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/users/:id', authenticate, hasPermission('manage_users'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const {
      email,
      password,
      firstName,
      lastName,
      role,
      phone,
      address,
      avatar,
      isActive,
      permissions,
    } = req.body;

    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (normalizedEmail !== user.email) {
        const duplicateUser = await User.findOne({
          where: {
            email: normalizedEmail,
            id: { [Op.ne]: user.id },
          },
        });
        if (duplicateUser) {
          return res.status(400).json({ success: false, message: 'Email already exists' });
        }
        user.email = normalizedEmail;
      }
    }

    if (role !== undefined && !ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role value' });
    }

    const continuityError = await ensureAdminContinuity(user, {
      role,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
    });
    if (continuityError) {
      return res.status(400).json({ success: false, message: continuityError });
    }

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (role !== undefined) user.role = role;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (avatar !== undefined) user.avatar = avatar;
    if (isActive !== undefined) user.isActive = Boolean(isActive);
    if (password !== undefined && String(password).trim() !== '') user.password = password;

    if (Array.isArray(permissions)) {
      user.permissions = normalizePermissionList(permissions);
    } else if (role !== undefined) {
      user.permissions = getRolePermissions(role);
    }

    await user.save();
    return res.json({ success: true, data: user.toSafeJSON() });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/users/:id/status', authenticate, hasPermission('manage_users'), async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isActive (boolean) is required' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const continuityError = await ensureAdminContinuity(user, { isActive });
    if (continuityError) {
      return res.status(400).json({ success: false, message: continuityError });
    }

    user.isActive = isActive;
    await user.save();

    return res.json({ success: true, data: user.toSafeJSON() });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/users/:id', authenticate, hasPermission('manage_users'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account' });
    }

    const continuityError = await ensureAdminContinuity(user, { isActive: false });
    if (continuityError) {
      return res.status(400).json({ success: false, message: continuityError });
    }

    user.isActive = false;
    await user.save();

    return res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
