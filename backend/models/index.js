import sequelize from '../config/database.js';
import AcademicYear from './AcademicYear.js';
import Attendance from './Attendance.js';
import Course from './Course.js';
import Department from './Department.js';
import Enrollment from './Enrollment.js';
import EyeScan from './EyeScan.js';
import Notification from './Notification.js';
import Student from './Student.js';
import Teacher from './Teacher.js';
import User from './User.js';

const applyAssociations = () => {
  User.hasOne(Student, { foreignKey: 'userId', as: 'studentProfile' });
  Student.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  User.hasOne(Teacher, { foreignKey: 'userId', as: 'teacherProfile' });
  Teacher.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  Department.hasMany(Student, { foreignKey: 'departmentId', as: 'students' });
  Student.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

  Department.hasMany(Teacher, { foreignKey: 'departmentId', as: 'teachers' });
  Teacher.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

  Department.hasMany(Course, { foreignKey: 'departmentId', as: 'courses' });
  Course.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

  Teacher.hasMany(Course, { foreignKey: 'teacherId', as: 'courses' });
  Course.belongsTo(Teacher, { foreignKey: 'teacherId', as: 'teacher' });

  AcademicYear.hasMany(Student, { foreignKey: 'academicYearId', as: 'students' });
  Student.belongsTo(AcademicYear, { foreignKey: 'academicYearId', as: 'academicYear' });

  Student.hasMany(Enrollment, { foreignKey: 'studentId', as: 'enrollments' });
  Enrollment.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });

  Course.hasMany(Enrollment, { foreignKey: 'courseId', as: 'enrollments' });
  Enrollment.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

  AcademicYear.hasMany(Enrollment, { foreignKey: 'academicYearId', as: 'enrollments' });
  Enrollment.belongsTo(AcademicYear, { foreignKey: 'academicYearId', as: 'academicYear' });

  User.hasMany(Enrollment, { foreignKey: 'enrolledBy', as: 'createdEnrollments' });
  Enrollment.belongsTo(User, { foreignKey: 'enrolledBy', as: 'enrolledByUser' });

  Student.hasMany(Attendance, { foreignKey: 'studentId', as: 'attendanceRecords' });
  Attendance.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });

  Course.hasMany(Attendance, { foreignKey: 'courseId', as: 'attendanceRecords' });
  Attendance.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

  AcademicYear.hasMany(Attendance, { foreignKey: 'academicYearId', as: 'attendanceRecords' });
  Attendance.belongsTo(AcademicYear, { foreignKey: 'academicYearId', as: 'academicYear' });

  User.hasMany(Attendance, { foreignKey: 'markedBy', as: 'markedAttendances' });
  Attendance.belongsTo(User, { foreignKey: 'markedBy', as: 'markedByUser' });

  User.hasMany(EyeScan, { foreignKey: 'userId', as: 'eyeScans' });
  EyeScan.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
  Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
};

applyAssociations();

export const syncDatabase = async () => {
  const alter = (process.env.DB_SYNC_ALTER || 'true').toLowerCase() === 'true';
  await sequelize.sync({ alter });
};

export {
  sequelize,
  User,
  Student,
  Teacher,
  Course,
  Enrollment,
  Attendance,
  EyeScan,
  Department,
  AcademicYear,
  Notification,
};
