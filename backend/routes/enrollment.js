import express from 'express';
import { Op } from 'sequelize';
import { authenticate } from '../middleware/auth.js';
import { hasPermission } from '../middleware/rbac.js';
import {
  AcademicYear,
  Course,
  Department,
  Enrollment,
  Student,
  Teacher,
  User,
} from '../models/index.js';

const router = express.Router();

const buildEnrollmentIncludes = () => ([
  {
    model: Student,
    as: 'student',
    include: [
      { model: User, as: 'user', attributes: { exclude: ['password'] } },
      { model: Department, as: 'department' },
    ],
  },
  {
    model: Course,
    as: 'course',
    include: [
      { model: Department, as: 'department' },
      {
        model: Teacher,
        as: 'teacher',
        include: [{ model: User, as: 'user', attributes: { exclude: ['password'] } }],
      },
    ],
  },
  { model: AcademicYear, as: 'academicYear' },
  { model: User, as: 'enrolledByUser', attributes: { exclude: ['password'] } },
]);

const resolveAcademicYearId = async (requestedAcademicYearId, student) => {
  if (requestedAcademicYearId) {
    return Number(requestedAcademicYearId);
  }

  if (student?.academicYearId) {
    return student.academicYearId;
  }

  const currentAcademicYear = await AcademicYear.findOne({ where: { isCurrent: true } });
  return currentAcademicYear?.id || null;
};

const getStudentIdForUser = async (userId) => {
  const student = await Student.findOne({ where: { userId } });
  return student?.id || null;
};

const createOrUpdateEnrollment = async (payload, enrolledByUserId) => {
  const { studentId, courseId } = payload;
  if (!studentId || !courseId) {
    throw new Error('studentId and courseId are required');
  }

  const student = await Student.findByPk(Number(studentId));
  if (!student) {
    throw new Error(`Student ${studentId} not found`);
  }

  const course = await Course.findByPk(Number(courseId));
  if (!course) {
    throw new Error(`Course ${courseId} not found`);
  }

  const academicYearId = await resolveAcademicYearId(payload.academicYearId, student);
  const targetYear = Number(payload.year || course.year || student.currentYear || 1);
  const targetSemester = Number(payload.semester || course.semester || student.currentSemester || 1);
  const status = payload.status || 'enrolled';
  const grade = payload.grade || '';

  const existing = await Enrollment.findOne({
    where: {
      studentId: student.id,
      courseId: course.id,
      academicYearId: academicYearId ? Number(academicYearId) : { [Op.is]: null },
    },
  });

  if (existing) {
    existing.status = status;
    existing.grade = grade;
    existing.year = targetYear;
    existing.semester = targetSemester;
    existing.enrolledBy = enrolledByUserId || existing.enrolledBy;
    await existing.save();
    return existing;
  }

  return Enrollment.create({
    studentId: student.id,
    courseId: course.id,
    academicYearId,
    year: targetYear,
    semester: targetSemester,
    enrollmentDate: payload.enrollmentDate || new Date(),
    status,
    grade,
    enrolledBy: enrolledByUserId || null,
  });
};

router.get(
  '/my',
  authenticate,
  hasPermission('view_own_courses', 'manage_enrollment', 'view_reports'),
  async (req, res) => {
    try {
      if (req.user.role !== 'student') {
        return res.status(403).json({
          success: false,
          message: 'This endpoint is only available for student accounts',
        });
      }

      const studentId = await getStudentIdForUser(req.user.id);
      if (!studentId) {
        return res.json({
          success: true,
          data: {
            enrollments: [],
            pagination: { total: 0, page: 1, pages: 0 },
          },
        });
      }

      const {
        status,
        year,
        semester,
        page = 1,
        limit = 20,
      } = req.query;

      const where = { studentId };
      if (status) where.status = status;
      if (year) where.year = Number(year);
      if (semester) where.semester = Number(semester);

      const pageNumber = Number(page) > 0 ? Number(page) : 1;
      const pageLimit = Number(limit) > 0 ? Number(limit) : 20;

      const { count, rows } = await Enrollment.findAndCountAll({
        where,
        include: buildEnrollmentIncludes(),
        offset: (pageNumber - 1) * pageLimit,
        limit: pageLimit,
        order: [['createdAt', 'DESC']],
        distinct: true,
      });

      return res.json({
        success: true,
        data: {
          enrollments: rows,
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

router.get('/', authenticate, hasPermission('manage_enrollment', 'view_reports'), async (req, res) => {
  try {
    const {
      student,
      course,
      academicYear,
      year,
      semester,
      status,
      page = 1,
      limit = 20,
    } = req.query;

    const where = {};
    if (student) where.studentId = Number(student);
    if (course) where.courseId = Number(course);
    if (academicYear) where.academicYearId = Number(academicYear);
    if (year) where.year = Number(year);
    if (semester) where.semester = Number(semester);
    if (status) where.status = status;

    const pageNumber = Number(page) > 0 ? Number(page) : 1;
    const pageLimit = Number(limit) > 0 ? Number(limit) : 20;

    const { count, rows } = await Enrollment.findAndCountAll({
      where,
      include: buildEnrollmentIncludes(),
      offset: (pageNumber - 1) * pageLimit,
      limit: pageLimit,
      order: [['createdAt', 'DESC']],
      distinct: true,
    });

    return res.json({
      success: true,
      data: {
        enrollments: rows,
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

router.post('/', authenticate, hasPermission('manage_enrollment'), async (req, res) => {
  try {
    const enrollment = await createOrUpdateEnrollment(req.body, req.user.id);
    const savedEnrollment = await Enrollment.findByPk(enrollment.id, {
      include: buildEnrollmentIncludes(),
    });

    return res.status(201).json({ success: true, data: savedEnrollment });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/bulk', authenticate, hasPermission('manage_enrollment'), async (req, res) => {
  try {
    const { enrollments } = req.body;
    if (!Array.isArray(enrollments) || enrollments.length === 0) {
      return res.status(400).json({ success: false, message: 'enrollments must be a non-empty array' });
    }

    const results = [];
    for (const enrollmentPayload of enrollments) {
      try {
        const record = await createOrUpdateEnrollment(enrollmentPayload, req.user.id);
        results.push({ success: true, id: record.id });
      } catch (error) {
        results.push({
          success: false,
          studentId: enrollmentPayload?.studentId,
          courseId: enrollmentPayload?.courseId,
          message: error.message,
        });
      }
    }

    const successCount = results.filter((item) => item.success).length;
    return res.json({
      success: true,
      message: `${successCount} of ${results.length} enrollment records processed`,
      data: results,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', authenticate, hasPermission('manage_enrollment'), async (req, res) => {
  try {
    const enrollment = await Enrollment.findByPk(req.params.id);
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    const {
      status,
      grade,
      year,
      semester,
      academicYearId,
    } = req.body;

    if (status !== undefined) enrollment.status = status;
    if (grade !== undefined) enrollment.grade = grade;
    if (year !== undefined) enrollment.year = Number(year);
    if (semester !== undefined) enrollment.semester = Number(semester);
    if (academicYearId !== undefined) {
      enrollment.academicYearId = academicYearId ? Number(academicYearId) : null;
    }
    enrollment.enrolledBy = req.user.id;

    await enrollment.save();

    const updatedEnrollment = await Enrollment.findByPk(enrollment.id, {
      include: buildEnrollmentIncludes(),
    });

    return res.json({ success: true, data: updatedEnrollment });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', authenticate, hasPermission('manage_enrollment'), async (req, res) => {
  try {
    const enrollment = await Enrollment.findByPk(req.params.id);
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    enrollment.status = 'dropped';
    enrollment.enrolledBy = req.user.id;
    await enrollment.save();

    return res.json({ success: true, message: 'Enrollment marked as dropped' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
