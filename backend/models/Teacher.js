import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Teacher = sequelize.define('Teacher', {
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
  teacherId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
  },
  departmentId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  qualification: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: '',
  },
  specialization: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: '',
  },
  joiningDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  assignedCourses: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
    defaultValue: '[]',
    get() {
      const rawValue = this.getDataValue('assignedCourses');
      if (!rawValue) return [];

      try {
        return JSON.parse(rawValue);
      } catch {
        return [];
      }
    },
    set(value) {
      this.setDataValue('assignedCourses', JSON.stringify(Array.isArray(value) ? value : []));
    },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'teachers',
});

export default Teacher;
