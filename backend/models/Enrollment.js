import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Enrollment = sequelize.define('Enrollment', {
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
  },
  semester: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  enrollmentDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  status: {
    type: DataTypes.ENUM('enrolled', 'dropped', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'enrolled',
  },
  grade: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: '',
  },
  enrolledBy: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
}, {
  tableName: 'enrollments',
  indexes: [
    { unique: true, fields: ['studentId', 'courseId', 'academicYearId'] },
  ],
});

export default Enrollment;
