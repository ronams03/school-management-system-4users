import express from 'express';
import { Op } from 'sequelize';
import { authenticate } from '../middleware/auth.js';
import { hasPermission } from '../middleware/rbac.js';
import {
  Attendance,
  Course,
  Department,
  Enrollment,
  EyeScan,
  Student,
  Teacher,
  User,
} from '../models/index.js';

const router = express.Router();

router.get('/overview', authenticate, hasPermission('view_reports'), async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [
      activeStudents,
      activeTeachers,
      activeDepartments,
      activeCourses,
      activeEnrollments,
      totalAttendance,
      presentAttendance,
      todayAttendance,
      eyeScans,
    ] = await Promise.all([
      Student.count({ where: { status: 'active' } }),
      Teacher.count({ where: { isActive: true } }),
      Department.count({ where: { isActive: true } }),
      Course.count({ where: { isActive: true } }),
      Enrollment.count({ where: { status: 'enrolled' } }),
      Attendance.count(),
      Attendance.count({ where: { status: 'present' } }),
      Attendance.count({ where: { attendanceDate: today } }),
      EyeScan.count({ where: { isActive: true } }),
    ]);

    const usersByRole = await Promise.all([
      User.count({ where: { role: 'admin', isActive: true } }),
      User.count({ where: { role: 'school_head', isActive: true } }),
      User.count({ where: { role: 'teacher', isActive: true } }),
      User.count({ where: { role: 'student', isActive: true } }),
    ]);

    return res.json({
      success: true,
      data: {
        cards: {
          activeStudents,
          activeTeachers,
          activeDepartments,
          activeCourses,
          activeEnrollments,
          todayAttendance,
          eyeScans,
        },
        attendance: {
          total: totalAttendance,
          present: presentAttendance,
          presentRate: totalAttendance > 0
            ? Number(((presentAttendance / totalAttendance) * 100).toFixed(2))
            : 0,
        },
        usersByRole: {
          admin: usersByRole[0],
          schoolHead: usersByRole[1],
          teacher: usersByRole[2],
          student: usersByRole[3],
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/attendance-trend', authenticate, hasPermission('view_reports'), async (req, res) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - (days - 1));

    const records = await Attendance.findAll({
      where: {
        attendanceDate: { [Op.gte]: startDate.toISOString().slice(0, 10) },
      },
      attributes: ['attendanceDate', 'status'],
      order: [['attendanceDate', 'ASC']],
    });

    const bucket = new Map();
    for (let offset = 0; offset < days; offset += 1) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + offset);
      const key = date.toISOString().slice(0, 10);
      bucket.set(key, {
        date: key,
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
      });
    }

    records.forEach((record) => {
      const key = record.attendanceDate;
      const item = bucket.get(key);
      if (!item) return;

      item.total += 1;
      if (record.status === 'present') item.present += 1;
      if (record.status === 'absent') item.absent += 1;
      if (record.status === 'late') item.late += 1;
      if (record.status === 'excused') item.excused += 1;
    });

    return res.json({
      success: true,
      data: Array.from(bucket.values()),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/department-enrollment', authenticate, hasPermission('view_reports'), async (req, res) => {
  try {
    const departments = await Department.findAll({
      order: [['name', 'ASC']],
    });

    const reportData = await Promise.all(
      departments.map(async (department) => {
        const [students, teachers, courses] = await Promise.all([
          Student.count({ where: { departmentId: department.id } }),
          Teacher.count({ where: { departmentId: department.id } }),
          Course.count({ where: { departmentId: department.id } }),
        ]);

        const departmentCourseRows = await Course.findAll({
          where: { departmentId: department.id },
          attributes: ['id'],
        });
        const courseIds = departmentCourseRows.map((course) => course.id);

        const enrollments = courseIds.length > 0
          ? await Enrollment.count({
              where: {
                courseId: { [Op.in]: courseIds },
                status: 'enrolled',
              },
            })
          : 0;

        return {
          id: department.id,
          name: department.name,
          code: department.code,
          isActive: department.isActive,
          students,
          teachers,
          courses,
          enrollments,
        };
      })
    );

    return res.json({ success: true, data: reportData });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/eye-scan-usage', authenticate, hasPermission('view_reports'), async (req, res) => {
  try {
    const scans = await EyeScan.findAll({
      include: [{ model: User, as: 'user', attributes: ['id', 'role', 'firstName', 'lastName'] }],
      order: [['lastUsed', 'DESC']],
    });

    const byRole = {
      admin: 0,
      school_head: 0,
      teacher: 0,
      student: 0,
    };

    scans.forEach((scan) => {
      const role = scan.user?.role;
      if (role && Object.prototype.hasOwnProperty.call(byRole, role)) {
        byRole[role] += 1;
      }
    });

    return res.json({
      success: true,
      data: {
        total: scans.length,
        active: scans.filter((scan) => scan.isActive).length,
        byRole,
        recentlyUsed: scans
          .filter((scan) => scan.lastUsed)
          .slice(0, 10)
          .map((scan) => ({
            id: scan.id,
            userId: scan.userId,
            user: scan.user,
            lastUsed: scan.lastUsed,
            quality: scan.quality,
          })),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
