import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Attendance = sequelize.define('Attendance', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  studentId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  courseId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  academicYearId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  year: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 1,
  },
  semester: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 1,
  },
  attendanceDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('present', 'absent', 'late', 'excused'),
    allowNull: false,
    defaultValue: 'present',
  },
  scanConfidence: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  eyeScanVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  markedBy: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  remarks: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: '',
  },
}, {
  tableName: 'attendance_records',
  indexes: [
    {
      unique: true,
      fields: ['studentId', 'courseId', 'attendanceDate'],
    },
  ],
});

export default Attendance;
