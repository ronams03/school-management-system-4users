import express from 'express';
import { Op } from 'sequelize';
import { authenticate } from '../middleware/auth.js';
import { hasPermission } from '../middleware/rbac.js';
import { generateTeacherId } from '../utils/helpers.js';
import {
  sequelize,
  Department,
  Teacher,
  User,
} from '../models/index.js';

const router = express.Router();

const buildTeacherIncludes = () => ([
  { model: User, as: 'user', attributes: { exclude: ['password'] } },
  { model: Department, as: 'department' },
]);

router.get('/', authenticate, hasPermission('manage_teachers', 'view_reports'), async (req, res) => {
  try {
    const {
      department,
      active,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const where = {};
    if (department) {
      where.departmentId = Number(department);
    }
    if (active !== undefined) {
      where.isActive = String(active).toLowerCase() === 'true';
    }

    if (search) {
      const matchedUsers = await User.findAll({
        where: {
          role: 'teacher',
          [Op.or]: [
            { firstName: { [Op.like]: `%${search}%` } },
            { lastName: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
          ],
        },
        attributes: ['id'],
      });

      const userIds = matchedUsers.map((user) => user.id);
      if (userIds.length === 0) {
        return res.json({
          success: true,
          data: {
            teachers: [],
            pagination: { total: 0, page: 1, pages: 0 },
          },
        });
      }
      where.userId = { [Op.in]: userIds };
    }

    const pageNumber = Number(page) > 0 ? Number(page) : 1;
    const pageLimit = Number(limit) > 0 ? Number(limit) : 20;

    const { count, rows } = await Teacher.findAndCountAll({
      where,
      include: buildTeacherIncludes(),
      offset: (pageNumber - 1) * pageLimit,
      limit: pageLimit,
      order: [['createdAt', 'DESC']],
      distinct: true,
    });

    return res.json({
      success: true,
      data: {
        teachers: rows,
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

router.get('/:id', authenticate, hasPermission('manage_teachers', 'view_reports'), async (req, res) => {
  try {
    const teacher = await Teacher.findByPk(req.params.id, {
      include: buildTeacherIncludes(),
    });

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    return res.json({ success: true, data: teacher });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', authenticate, hasPermission('manage_teachers'), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      address,
      department,
      qualification,
      specialization,
      joiningDate,
      isActive = true,
    } = req.body;

    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !firstName || !lastName) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Missing required teacher fields' });
    }

    const existingUser = await User.findOne({
      where: { email: normalizedEmail },
      transaction,
    });
    if (existingUser) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const departmentRecord = department
      ? await Department.findByPk(Number(department), { transaction })
      : null;

    const user = await User.create({
      email: normalizedEmail,
      password: password || 'teacher123',
      firstName,
      lastName,
      role: 'teacher',
      phone: phone || '',
      address: address || '',
      isActive: Boolean(isActive),
    }, { transaction });

    const teacher = await Teacher.create({
      userId: user.id,
      teacherId: generateTeacherId(departmentRecord?.code || 'GEN'),
      departmentId: departmentRecord?.id || null,
      qualification: qualification || '',
      specialization: specialization || '',
      joiningDate: joiningDate || new Date(),
      isActive: Boolean(isActive),
    }, { transaction });

    await transaction.commit();

    const createdTeacher = await Teacher.findByPk(teacher.id, {
      include: buildTeacherIncludes(),
    });

    return res.status(201).json({ success: true, data: createdTeacher });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', authenticate, hasPermission('manage_teachers'), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const teacher = await Teacher.findByPk(req.params.id, { transaction });
    if (!teacher) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    const user = await User.findByPk(teacher.userId, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Linked user account not found' });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      department,
      qualification,
      specialization,
      joiningDate,
      isActive,
    } = req.body;

    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (normalizedEmail !== user.email) {
        const duplicate = await User.findOne({
          where: {
            email: normalizedEmail,
            id: { [Op.ne]: user.id },
          },
          transaction,
        });
        if (duplicate) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: 'Email already exists' });
        }
        user.email = normalizedEmail;
      }
    }

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (isActive !== undefined) user.isActive = Boolean(isActive);
    await user.save({ transaction });

    if (department !== undefined) {
      const departmentRecord = department
        ? await Department.findByPk(Number(department), { transaction })
        : null;
      teacher.departmentId = departmentRecord?.id || null;
    }
    if (qualification !== undefined) teacher.qualification = qualification;
    if (specialization !== undefined) teacher.specialization = specialization;
    if (joiningDate !== undefined) teacher.joiningDate = joiningDate;
    if (isActive !== undefined) teacher.isActive = Boolean(isActive);
    await teacher.save({ transaction });

    await transaction.commit();

    const updatedTeacher = await Teacher.findByPk(teacher.id, {
      include: buildTeacherIncludes(),
    });

    return res.json({ success: true, data: updatedTeacher });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', authenticate, hasPermission('manage_teachers'), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const teacher = await Teacher.findByPk(req.params.id, { transaction });
    if (!teacher) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    const user = await User.findByPk(teacher.userId, { transaction });

    teacher.isActive = false;
    await teacher.save({ transaction });

    if (user) {
      user.isActive = false;
      await user.save({ transaction });
    }

    await transaction.commit();
    return res.json({ success: true, message: 'Teacher deactivated successfully' });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
