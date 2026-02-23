import express from 'express';
import { Op } from 'sequelize';
import { authenticate } from '../middleware/auth.js';
import { hasPermission } from '../middleware/rbac.js';
import { generateStudentId } from '../utils/helpers.js';
import {
  sequelize,
  AcademicYear,
  Course,
  Department,
  Enrollment,
  Student,
  User,
} from '../models/index.js';

const router = express.Router();

const buildStudentIncludes = () => [
  { model: User, as: 'user', attributes: { exclude: ['password'] } },
  { model: Department, as: 'department' },
  { model: AcademicYear, as: 'academicYear' },
];

const STUDENT_STATUSES = new Set(['active', 'inactive', 'graduated', 'suspended', 'transferred']);
const isValidStudentStatus = (status) => STUDENT_STATUSES.has(String(status || '').toLowerCase());

const isUserActiveForStudentStatus = (status) => (
  !['inactive', 'suspended'].includes(String(status || '').toLowerCase())
);

// Get all students
router.get('/', authenticate, hasPermission('manage_students', 'view_reports'), async (req, res) => {
  try {
    const { department, year, semester, status, search, page = 1, limit = 20 } = req.query;
    const where = {};

    if (department) where.departmentId = Number(department);
    if (year) where.currentYear = Number(year);
    if (semester) where.currentSemester = Number(semester);
    if (status) where.status = status;

    if (search) {
      const matchedUsers = await User.findAll({
        where: {
          role: 'student',
          [Op.or]: [
            { firstName: { [Op.like]: `%${search}%` } },
            { lastName: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
          ],
        },
        attributes: ['id'],
      });

      const userIds = matchedUsers.map((user) => user.id);
      const searchWhere = [{ studentId: { [Op.like]: `%${search}%` } }];
      if (userIds.length > 0) {
        searchWhere.push({ userId: { [Op.in]: userIds } });
      }
      where[Op.or] = searchWhere;
    }

    const pageNumber = Number(page) > 0 ? Number(page) : 1;
    const pageLimit = Number(limit) > 0 ? Number(limit) : 20;
    const offset = (pageNumber - 1) * pageLimit;

    const { count, rows } = await Student.findAndCountAll({
      where,
      include: buildStudentIncludes(),
      offset,
      limit: pageLimit,
      order: [['createdAt', 'DESC']],
      distinct: true,
    });

    return res.json({
      success: true,
      data: {
        students: rows,
        pagination: { total: count, page: pageNumber, pages: Math.ceil(count / pageLimit) },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Get student by ID
router.get('/:id', authenticate, hasPermission(
  'manage_students',
  'view_reports',
  'take_attendance',
  'view_attendance',
  'view_own_attend'
), async (req, res) => {
  try {
    if (req.user.role === 'student') {
      const ownStudent = await Student.findOne({
        where: { userId: req.user.id },
        attributes: ['id'],
      });

      if (!ownStudent || ownStudent.id !== Number(req.params.id)) {
        return res.status(403).json({
          success: false,
          message: 'You can only access your own student profile',
        });
      }
    }

    const student = await Student.findByPk(req.params.id, {
      include: buildStudentIncludes(),
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const enrollments = await Enrollment.findAll({
      where: { studentId: student.id },
      include: [
        { model: Course, as: 'course' },
        { model: AcademicYear, as: 'academicYear' },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.json({ success: true, data: { student, enrollments } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Create student
router.post('/', authenticate, hasPermission('manage_students'), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      address,
      dateOfBirth,
      gender,
      department,
      currentYear,
      currentSemester,
      guardianName,
      guardianPhone,
      guardianEmail,
      bloodGroup,
      status = 'active',
    } = req.body;

    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !firstName || !lastName || !dateOfBirth || !gender) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Missing required student fields' });
    }
    const normalizedStatus = String(status).toLowerCase();
    if (!isValidStudentStatus(normalizedStatus)) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Invalid student status' });
    }

    const existingUser = await User.findOne({
      where: { email: normalizedEmail },
      transaction,
    });
    if (existingUser) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const dept = department
      ? await Department.findByPk(Number(department), { transaction })
      : null;
    if (department && !dept) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Invalid department selected' });
    }

    const user = await User.create({
      email: normalizedEmail,
      password: password || 'student123',
      firstName,
      lastName,
      role: 'student',
      phone: phone || '',
      address: address || '',
      isActive: isUserActiveForStudentStatus(normalizedStatus),
    }, { transaction });

    const academicYear = await AcademicYear.findOne({
      where: { isCurrent: true },
      transaction,
    });

    const studentId = generateStudentId(dept?.code || 'GEN', new Date().getFullYear());

    const student = await Student.create({
      userId: user.id,
      studentId,
      dateOfBirth,
      gender,
      departmentId: dept ? dept.id : null,
      currentYear: currentYear || 1,
      currentSemester: currentSemester || 1,
      academicYearId: academicYear?.id || null,
      guardianName: guardianName || '',
      guardianPhone: guardianPhone || '',
      guardianEmail: guardianEmail || '',
      bloodGroup: bloodGroup || '',
      status: normalizedStatus,
    }, { transaction });

    await transaction.commit();

    const createdStudent = await Student.findByPk(student.id, {
      include: buildStudentIncludes(),
    });

    return res.status(201).json({ success: true, data: createdStudent });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Update student
router.put('/:id', authenticate, hasPermission('manage_students'), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const student = await Student.findByPk(req.params.id, { transaction });
    if (!student) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const {
      firstName,
      lastName,
      phone,
      address,
      email,
      password,
      dateOfBirth,
      gender,
      department,
      guardianName,
      guardianPhone,
      guardianEmail,
      bloodGroup,
      status,
      currentYear,
      currentSemester,
    } = req.body;

    const user = await User.findByPk(student.userId, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Linked user account not found' });
    }
    const normalizedStatus = status !== undefined ? String(status).toLowerCase() : undefined;
    if (normalizedStatus !== undefined && !isValidStudentStatus(normalizedStatus)) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Invalid student status' });
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (!normalizedEmail) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Email cannot be empty' });
      }

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
      }

      user.email = normalizedEmail;
    }

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (password !== undefined && String(password).trim()) {
      user.password = String(password).trim();
    }
    if (normalizedStatus !== undefined) {
      user.isActive = isUserActiveForStudentStatus(normalizedStatus);
    }
    await user.save({ transaction });

    if (dateOfBirth !== undefined) student.dateOfBirth = dateOfBirth;
    if (gender !== undefined) student.gender = gender;
    if (department !== undefined) {
      if (department) {
        const departmentRecord = await Department.findByPk(Number(department), { transaction });
        if (!departmentRecord) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: 'Invalid department selected' });
        }
        student.departmentId = departmentRecord.id;
      } else {
        student.departmentId = null;
      }
    }
    if (guardianName !== undefined) student.guardianName = guardianName;
    if (guardianPhone !== undefined) student.guardianPhone = guardianPhone;
    if (guardianEmail !== undefined) student.guardianEmail = guardianEmail;
    if (bloodGroup !== undefined) student.bloodGroup = bloodGroup;
    if (normalizedStatus !== undefined) student.status = normalizedStatus;
    if (currentYear !== undefined) student.currentYear = Number(currentYear);
    if (currentSemester !== undefined) student.currentSemester = Number(currentSemester);
    await student.save({ transaction });

    await transaction.commit();

    const updatedStudent = await Student.findByPk(student.id, {
      include: buildStudentIncludes(),
    });

    return res.json({ success: true, data: updatedStudent });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Deactivate student
router.delete('/:id', authenticate, hasPermission('manage_students'), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const student = await Student.findByPk(req.params.id, { transaction });
    if (!student) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const user = await User.findByPk(student.userId, { transaction });

    student.status = 'inactive';
    await student.save({ transaction });

    if (user) {
      user.isActive = false;
      await user.save({ transaction });
    }

    await Enrollment.update(
      { status: 'dropped' },
      {
        where: {
          studentId: student.id,
          status: 'enrolled',
        },
        transaction,
      }
    );

    await transaction.commit();
    return res.json({ success: true, message: 'Student deactivated successfully' });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Promote student(s) to next year/semester
router.post('/promote', authenticate, hasPermission('promote_students'), async (req, res) => {
  try {
    const { studentIds, toYear, toSemester, academicYearId } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'studentIds must be a non-empty array' });
    }

    const targetYear = Number(toYear);
    const targetSemester = Number(toSemester);
    const targetAcademicYearId = academicYearId ? Number(academicYearId) : null;

    const results = [];
    for (const rawStudentId of studentIds) {
      const student = await Student.findByPk(Number(rawStudentId));
      if (!student) {
        results.push({ studentId: rawStudentId, success: false, message: 'Student not found' });
        continue;
      }

      const fromYear = student.currentYear;
      const fromSemester = student.currentSemester;
      const promotionHistory = Array.isArray(student.promotionHistory) ? [...student.promotionHistory] : [];
      promotionHistory.push({
        fromYear,
        fromSemester,
        toYear: targetYear,
        toSemester: targetSemester,
        date: new Date().toISOString(),
        promotedBy: req.user.id,
        academicYearId: targetAcademicYearId,
      });

      student.promotionHistory = promotionHistory;
      student.currentYear = targetYear;
      student.currentSemester = targetSemester;
      if (targetAcademicYearId) {
        student.academicYearId = targetAcademicYearId;
      }
      await student.save();

      await Enrollment.update(
        { status: 'completed' },
        {
          where: {
            studentId: student.id,
            year: fromYear,
            semester: fromSemester,
            status: 'enrolled',
          },
        }
      );

      results.push({
        studentId: student.id,
        success: true,
        message: `Promoted from Y${fromYear}/S${fromSemester} to Y${targetYear}/S${targetSemester}`,
      });
    }

    return res.json({ success: true, data: results });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk promote by department/year
router.post('/promote/bulk', authenticate, hasPermission('promote_students'), async (req, res) => {
  try {
    const { department, fromYear, fromSemester, toYear, toSemester, academicYearId } = req.body;
    const where = {
      status: 'active',
      currentYear: Number(fromYear),
      currentSemester: Number(fromSemester),
    };
    if (department) {
      where.departmentId = Number(department);
    }

    const students = await Student.findAll({ where });
    const targetYear = Number(toYear);
    const targetSemester = Number(toSemester);
    const targetAcademicYearId = academicYearId ? Number(academicYearId) : null;

    const results = [];
    for (const student of students) {
      const promotionHistory = Array.isArray(student.promotionHistory) ? [...student.promotionHistory] : [];
      promotionHistory.push({
        fromYear: student.currentYear,
        fromSemester: student.currentSemester,
        toYear: targetYear,
        toSemester: targetSemester,
        date: new Date().toISOString(),
        promotedBy: req.user.id,
        academicYearId: targetAcademicYearId,
      });

      student.promotionHistory = promotionHistory;
      student.currentYear = targetYear;
      student.currentSemester = targetSemester;
      if (targetAcademicYearId) {
        student.academicYearId = targetAcademicYearId;
      }
      await student.save();

      await Enrollment.update(
        { status: 'completed' },
        {
          where: {
            studentId: student.id,
            year: Number(fromYear),
            semester: Number(fromSemester),
            status: 'enrolled',
          },
        }
      );

      results.push({ studentId: student.studentId, success: true });
    }

    return res.json({
      success: true,
      message: `${results.length} students promoted successfully`,
      data: results,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
