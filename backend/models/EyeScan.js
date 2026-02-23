import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const EyeScan = sequelize.define('EyeScan', {
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
  irisTemplate: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
  },
  eye: {
    type: DataTypes.ENUM('left', 'right', 'both'),
    allowNull: false,
    defaultValue: 'right',
  },
  quality: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 80,
  },
  enrollmentDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  lastUsed: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'eye_scans',
});

export default EyeScan;
