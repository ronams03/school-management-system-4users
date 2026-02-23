import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Student = sequelize.define('Student', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    unique: true,
  },
  studentId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: false,
  },
  departmentId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  currentYear: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 1,
  },
  currentSemester: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 1,
  },
  enrollmentDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  academicYearId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  guardianName: {
    type: DataTypes.STRING(120),
    allowNull: false,
    defaultValue: '',
  },
  guardianPhone: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: '',
  },
  guardianEmail: {
    type: DataTypes.STRING(191),
    allowNull: false,
    defaultValue: '',
  },
  bloodGroup: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: '',
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'graduated', 'suspended', 'transferred'),
    allowNull: false,
    defaultValue: 'active',
  },
  eyeScanEnrolled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  promotionHistory: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
    defaultValue: '[]',
    get() {
      const rawValue = this.getDataValue('promotionHistory');
      if (!rawValue) return [];

      try {
        return JSON.parse(rawValue);
      } catch {
        return [];
      }
    },
    set(value) {
      this.setDataValue('promotionHistory', JSON.stringify(Array.isArray(value) ? value : []));
    },
  },
}, {
  tableName: 'students',
  indexes: [
    { unique: true, fields: ['studentId'] },
    { fields: ['departmentId', 'currentYear'] },
  ],
});

export default Student;
