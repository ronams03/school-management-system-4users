import express from 'express';
import { Op } from 'sequelize';
import { authenticate } from '../middleware/auth.js';
import { hasPermission } from '../middleware/rbac.js';
import {
  Course,
  Department,
  Enrollment,
  Teacher,
  User,
} from '../models/index.js';

const router = express.Router();

const buildCourseIncludes = () => ([
  { model: Department, as: 'department' },
  {
    model: Teacher,
    as: 'teacher',
    include: [{ model: User, as: 'user', attributes: { exclude: ['password'] } }],
  },
]);

router.get(
  '/',
  authenticate,
  hasPermission(
    'manage_courses',
    'manage_enrollment',
    'take_attendance',
    'view_attendance',
    'view_reports'
  ),
  async (req, res) => {
    try {
      const {
        department,
        teacher,
        year,
        semester,
        active,
        search,
        page = 1,
        limit = 20,
      } = req.query;

      const where = {};
      if (department) where.departmentId = Number(department);
      if (teacher) where.teacherId = Number(teacher);
      if (year) where.year = Number(year);
      if (semester) where.semester = Number(semester);
      if (active !== undefined) where.isActive = String(active).toLowerCase() === 'true';

      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { code: { [Op.like]: `%${search}%` } },
        ];
      }

      const pageNumber = Number(page) > 0 ? Number(page) : 1;
      const pageLimit = Number(limit) > 0 ? Number(limit) : 20;

      const { count, rows } = await Course.findAndCountAll({
        where,
        include: buildCourseIncludes(),
        offset: (pageNumber - 1) * pageLimit,
        limit: pageLimit,
        order: [['createdAt', 'DESC']],
        distinct: true,
      });

      return res.json({
        success: true,
        data: {
          courses: rows,
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
  }
);

router.get(
  '/:id',
  authenticate,
  hasPermission(
    'manage_courses',
    'manage_enrollment',
    'take_attendance',
    'view_attendance',
    'view_reports'
  ),
  async (req, res) => {
    try {
      const course = await Course.findByPk(req.params.id, {
        include: buildCourseIncludes(),
      });
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }

      const enrollmentCount = await Enrollment.count({
        where: {
          courseId: course.id,
          status: 'enrolled',
        },
      });

      return res.json({
        success: true,
        data: {
          ...course.toJSON(),
          metrics: { enrollmentCount },
        },
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.post('/', authenticate, hasPermission('manage_courses'), async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      departmentId,
      year = 1,
      semester = 1,
      credits = 0,
      teacherId,
      isActive = true,
    } = req.body;

    const normalizedCode = String(code || '').trim().toUpperCase();
    if (!normalizedCode || !name) {
      return res.status(400).json({ success: false, message: 'code and name are required' });
    }

    const existingCode = await Course.findOne({ where: { code: normalizedCode } });
    if (existingCode) {
      return res.status(400).json({ success: false, message: 'Course code already exists' });
    }

    if (departmentId) {
      const department = await Department.findByPk(Number(departmentId));
      if (!department) {
        return res.status(400).json({ success: false, message: 'Invalid departmentId' });
      }
    }

    if (teacherId) {
      const teacher = await Teacher.findByPk(Number(teacherId));
      if (!teacher) {
        return res.status(400).json({ success: false, message: 'Invalid teacherId' });
      }
    }

    const course = await Course.create({
      code: normalizedCode,
      name: String(name).trim(),
      description: description || '',
      departmentId: departmentId ? Number(departmentId) : null,
      year: Number(year) || 1,
      semester: Number(semester) || 1,
      credits: Number(credits) || 0,
      teacherId: teacherId ? Number(teacherId) : null,
      isActive: Boolean(isActive),
    });

    const createdCourse = await Course.findByPk(course.id, {
      include: buildCourseIncludes(),
    });

    return res.status(201).json({ success: true, data: createdCourse });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', authenticate, hasPermission('manage_courses'), async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const {
      code,
      name,
      description,
      departmentId,
      year,
      semester,
      credits,
      teacherId,
      isActive,
    } = req.body;

    if (code !== undefined) {
      const normalizedCode = String(code).trim().toUpperCase();
      if (normalizedCode !== course.code) {
        const duplicate = await Course.findOne({
          where: {
            code: normalizedCode,
            id: { [Op.ne]: course.id },
          },
        });
        if (duplicate) {
          return res.status(400).json({ success: false, message: 'Course code already exists' });
        }
        course.code = normalizedCode;
      }
    }

    if (departmentId !== undefined) {
      if (departmentId) {
        const department = await Department.findByPk(Number(departmentId));
        if (!department) {
          return res.status(400).json({ success: false, message: 'Invalid departmentId' });
        }
      }
      course.departmentId = departmentId ? Number(departmentId) : null;
    }

    if (teacherId !== undefined) {
      if (teacherId) {
        const teacher = await Teacher.findByPk(Number(teacherId));
        if (!teacher) {
          return res.status(400).json({ success: false, message: 'Invalid teacherId' });
        }
      }
      course.teacherId = teacherId ? Number(teacherId) : null;
    }

    if (name !== undefined) course.name = String(name).trim();
    if (description !== undefined) course.description = description;
    if (year !== undefined) course.year = Number(year) || 1;
    if (semester !== undefined) course.semester = Number(semester) || 1;
    if (credits !== undefined) course.credits = Number(credits) || 0;
    if (isActive !== undefined) course.isActive = Boolean(isActive);

    await course.save();

    const updatedCourse = await Course.findByPk(course.id, {
      include: buildCourseIncludes(),
    });

    return res.json({ success: true, data: updatedCourse });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', authenticate, hasPermission('manage_courses'), async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    course.isActive = false;
    await course.save();

    return res.json({ success: true, message: 'Course deactivated successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
