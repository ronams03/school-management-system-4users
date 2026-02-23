import express from 'express';
import { Op } from 'sequelize';
import { authenticate } from '../middleware/auth.js';
import { hasPermission } from '../middleware/rbac.js';
import {
  Course,
  Department,
  Student,
  Teacher,
} from '../models/index.js';

const router = express.Router();

router.get(
  '/',
  authenticate,
  hasPermission(
    'manage_departments',
    'manage_students',
    'manage_teachers',
    'manage_courses',
    'view_reports'
  ),
  async (req, res) => {
    try {
      const { search, active, includeCounts } = req.query;
      const where = {};

      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { code: { [Op.like]: `%${search}%` } },
        ];
      }

      if (active !== undefined) {
        where.isActive = String(active).toLowerCase() === 'true';
      }

      const departments = await Department.findAll({
        where,
        order: [['name', 'ASC']],
      });

      if (String(includeCounts).toLowerCase() !== 'true') {
        return res.json({ success: true, data: departments });
      }

      const withCounts = await Promise.all(
        departments.map(async (department) => {
          const [studentCount, teacherCount, courseCount] = await Promise.all([
            Student.count({ where: { departmentId: department.id } }),
            Teacher.count({ where: { departmentId: department.id } }),
            Course.count({ where: { departmentId: department.id } }),
          ]);

          return {
            ...department.toJSON(),
            metrics: {
              studentCount,
              teacherCount,
              courseCount,
            },
          };
        })
      );

      return res.json({ success: true, data: withCounts });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.get(
  '/:id',
  authenticate,
  hasPermission(
    'manage_departments',
    'manage_students',
    'manage_teachers',
    'manage_courses',
    'view_reports'
  ),
  async (req, res) => {
    try {
      const department = await Department.findByPk(req.params.id);
      if (!department) {
        return res.status(404).json({ success: false, message: 'Department not found' });
      }

      const [studentCount, teacherCount, courseCount] = await Promise.all([
        Student.count({ where: { departmentId: department.id } }),
        Teacher.count({ where: { departmentId: department.id } }),
        Course.count({ where: { departmentId: department.id } }),
      ]);

      return res.json({
        success: true,
        data: {
          ...department.toJSON(),
          metrics: {
            studentCount,
            teacherCount,
            courseCount,
          },
        },
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.post('/', authenticate, hasPermission('manage_departments'), async (req, res) => {
  try {
    const { name, code, description, isActive = true } = req.body;
    const normalizedCode = String(code || '').trim().toUpperCase();

    if (!name || !normalizedCode) {
      return res.status(400).json({ success: false, message: 'name and code are required' });
    }

    const existingDepartment = await Department.findOne({ where: { code: normalizedCode } });
    if (existingDepartment) {
      return res.status(400).json({ success: false, message: 'Department code already exists' });
    }

    const department = await Department.create({
      name: String(name).trim(),
      code: normalizedCode,
      description: description || '',
      isActive: Boolean(isActive),
    });

    return res.status(201).json({ success: true, data: department });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', authenticate, hasPermission('manage_departments'), async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const {
      name,
      code,
      description,
      isActive,
    } = req.body;

    if (code !== undefined) {
      const normalizedCode = String(code).trim().toUpperCase();
      if (normalizedCode !== department.code) {
        const duplicate = await Department.findOne({
          where: {
            code: normalizedCode,
            id: { [Op.ne]: department.id },
          },
        });
        if (duplicate) {
          return res.status(400).json({ success: false, message: 'Department code already exists' });
        }
        department.code = normalizedCode;
      }
    }

    if (name !== undefined) department.name = String(name).trim();
    if (description !== undefined) department.description = description;
    if (isActive !== undefined) department.isActive = Boolean(isActive);

    await department.save();
    return res.json({ success: true, data: department });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', authenticate, hasPermission('manage_departments'), async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    department.isActive = false;
    await department.save();

    return res.json({ success: true, message: 'Department deactivated successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
