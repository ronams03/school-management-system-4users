import express from 'express';
import { Op } from 'sequelize';
import { authenticate } from '../middleware/auth.js';
import { hasPermission } from '../middleware/rbac.js';
import {
  AcademicYear,
  Attendance,
  Course,
  Department,
  Student,
  User,
} from '../models/index.js';

const router = express.Router();

const buildAttendanceIncludes = () => ([
  {
    model: Student,
    as: 'student',
    include: [
      { model: User, as: 'user', attributes: { exclude: ['password'] } },
      { model: Department, as: 'department' },
    ],
  },
  { model: Course, as: 'course' },
  { model: AcademicYear, as: 'academicYear' },
  { model: User, as: 'markedByUser', attributes: { exclude: ['password'] } },
]);

const resolveCurrentAcademicYearId = async (requestedAcademicYearId) => {
  if (requestedAcademicYearId) {
    return Number(requestedAcademicYearId);
  }

  const currentAcademicYear = await AcademicYear.findOne({ where: { isCurrent: true } });
  return currentAcademicYear?.id || null;
};

const normalizeDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

const getStudentIdForUser = async (userId) => {
  const student = await Student.findOne({ where: { userId } });
  return student?.id || null;
};

const markSingleAttendance = async (payload, markerUserId) => {
  const {
    studentId,
    courseId,
    attendanceDate,
    status = 'present',
    year,
    semester,
    academicYearId,
    scanConfidence,
    eyeScanVerified = false,
    remarks = '',
  } = payload;

  if (!studentId || !courseId || !attendanceDate) {
    throw new Error('studentId, courseId and attendanceDate are required');
  }

  const student = await Student.findByPk(Number(studentId));
  if (!student) {
    throw new Error(`Student ${studentId} not found`);
  }

  const course = await Course.findByPk(Number(courseId));
  if (!course) {
    throw new Error(`Course ${courseId} not found`);
  }

  const normalizedAttendanceDate = normalizeDate(attendanceDate);
  if (!normalizedAttendanceDate) {
    throw new Error('Invalid attendanceDate');
  }

  const resolvedAcademicYearId = await resolveCurrentAcademicYearId(academicYearId);
  const resolvedYear = Number(year || course.year || student.currentYear || 1);
  const resolvedSemester = Number(semester || course.semester || student.currentSemester || 1);

  const existingRecord = await Attendance.findOne({
    where: {
      studentId: student.id,
      courseId: course.id,
      attendanceDate: normalizedAttendanceDate,
    },
  });

  if (existingRecord) {
    existingRecord.status = status;
    existingRecord.year = resolvedYear;
    existingRecord.semester = resolvedSemester;
    existingRecord.academicYearId = resolvedAcademicYearId;
    existingRecord.scanConfidence = scanConfidence ?? existingRecord.scanConfidence;
    existingRecord.eyeScanVerified = Boolean(eyeScanVerified);
    existingRecord.remarks = remarks;
    existingRecord.markedBy = markerUserId;
    await existingRecord.save();
    return existingRecord;
  }

  return Attendance.create({
    studentId: student.id,
    courseId: course.id,
    academicYearId: resolvedAcademicYearId,
    year: resolvedYear,
    semester: resolvedSemester,
    attendanceDate: normalizedAttendanceDate,
    status,
    scanConfidence: scanConfidence ?? null,
    eyeScanVerified: Boolean(eyeScanVerified),
    markedBy: markerUserId,
    remarks,
  });
};

router.get(
  '/',
  authenticate,
  hasPermission('take_attendance', 'view_attendance', 'view_own_attend'),
  async (req, res) => {
    try {
      const {
        student,
        course,
        status,
        attendanceDate,
        fromDate,
        toDate,
        year,
        semester,
        page = 1,
        limit = 20,
      } = req.query;

      const where = {};

      if (req.user.role === 'student') {
        const studentId = await getStudentIdForUser(req.user.id);
        if (!studentId) {
          return res.json({
            success: true,
            data: {
              attendance: [],
              pagination: { total: 0, page: 1, pages: 0 },
            },
          });
        }
        where.studentId = studentId;
      } else if (student) {
        where.studentId = Number(student);
      }

      if (course) where.courseId = Number(course);
      if (status) where.status = status;
      if (year) where.year = Number(year);
      if (semester) where.semester = Number(semester);

      const normalizedAttendanceDate = normalizeDate(attendanceDate);
      const normalizedFromDate = normalizeDate(fromDate);
      const normalizedToDate = normalizeDate(toDate);

      if (normalizedAttendanceDate) {
        where.attendanceDate = normalizedAttendanceDate;
      } else if (normalizedFromDate || normalizedToDate) {
        where.attendanceDate = {};
        if (normalizedFromDate) where.attendanceDate[Op.gte] = normalizedFromDate;
        if (normalizedToDate) where.attendanceDate[Op.lte] = normalizedToDate;
      }

      const pageNumber = Number(page) > 0 ? Number(page) : 1;
      const pageLimit = Number(limit) > 0 ? Number(limit) : 20;

      const { count, rows } = await Attendance.findAndCountAll({
        where,
        include: buildAttendanceIncludes(),
        offset: (pageNumber - 1) * pageLimit,
        limit: pageLimit,
        order: [['attendanceDate', 'DESC'], ['createdAt', 'DESC']],
        distinct: true,
      });

      return res.json({
        success: true,
        data: {
          attendance: rows,
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

router.get('/my', authenticate, hasPermission('view_own_attend'), async (req, res) => {
  try {
    const studentId = await getStudentIdForUser(req.user.id);
    if (!studentId) {
      return res.json({ success: true, data: [] });
    }

    const records = await Attendance.findAll({
      where: { studentId },
      include: buildAttendanceIncludes(),
      order: [['attendanceDate', 'DESC'], ['createdAt', 'DESC']],
      limit: 100,
    });

    return res.json({ success: true, data: records });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/mark', authenticate, hasPermission('take_attendance'), async (req, res) => {
  try {
    const record = await markSingleAttendance(req.body, req.user.id);
    const savedRecord = await Attendance.findByPk(record.id, {
      include: buildAttendanceIncludes(),
    });

    return res.status(201).json({ success: true, data: savedRecord });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/bulk-mark', authenticate, hasPermission('take_attendance'), async (req, res) => {
  try {
    const {
      courseId,
      attendanceDate,
      academicYearId,
      year,
      semester,
      records,
    } = req.body;

    if (!courseId || !attendanceDate || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'courseId, attendanceDate and records[] are required',
      });
    }

    const results = [];
    for (const record of records) {
      try {
        const saved = await markSingleAttendance(
          {
            ...record,
            courseId,
            attendanceDate,
            academicYearId,
            year,
            semester,
          },
          req.user.id
        );
        results.push({ success: true, id: saved.id, studentId: record.studentId });
      } catch (error) {
        results.push({
          success: false,
          studentId: record.studentId,
          message: error.message,
        });
      }
    }

    const successCount = results.filter((item) => item.success).length;
    return res.json({
      success: true,
      message: `${successCount} of ${results.length} attendance rows processed`,
      data: results,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get(
  '/summary',
  authenticate,
  hasPermission('take_attendance', 'view_attendance', 'view_reports'),
  async (req, res) => {
    try {
      const { fromDate, toDate, course } = req.query;
      const where = {};

      const normalizedFromDate = normalizeDate(fromDate);
      const normalizedToDate = normalizeDate(toDate);
      if (normalizedFromDate || normalizedToDate) {
        where.attendanceDate = {};
        if (normalizedFromDate) where.attendanceDate[Op.gte] = normalizedFromDate;
        if (normalizedToDate) where.attendanceDate[Op.lte] = normalizedToDate;
      }
      if (course) {
        where.courseId = Number(course);
      }

      const [total, present, absent, late, excused] = await Promise.all([
        Attendance.count({ where }),
        Attendance.count({ where: { ...where, status: 'present' } }),
        Attendance.count({ where: { ...where, status: 'absent' } }),
        Attendance.count({ where: { ...where, status: 'late' } }),
        Attendance.count({ where: { ...where, status: 'excused' } }),
      ]);

      return res.json({
        success: true,
        data: {
          total,
          present,
          absent,
          late,
          excused,
          presentRate: total > 0 ? Number(((present / total) * 100).toFixed(2)) : 0,
        },
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

export default router;
