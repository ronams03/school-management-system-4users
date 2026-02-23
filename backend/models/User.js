import bcrypt from 'bcryptjs';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { ROLES, getRolePermissions, normalizePermissionList } from '../utils/permissions.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING(191),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [6, 255],
    },
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM(...ROLES),
    allowNull: false,
  },
  avatar: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: '',
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: '',
  },
  address: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: '',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  permissions: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
    defaultValue: '[]',
    get() {
      const rawValue = this.getDataValue('permissions');
      if (!rawValue) return [];

      try {
        return JSON.parse(rawValue);
      } catch {
        return [];
      }
    },
    set(value) {
      const normalized = normalizePermissionList(Array.isArray(value) ? value : []);
      this.setDataValue('permissions', JSON.stringify(normalized));
    },
  },
}, {
  tableName: 'users',
  hooks: {
    beforeValidate(user) {
      if (!Array.isArray(user.permissions) || user.permissions.length === 0) {
        user.permissions = getRolePermissions(user.role);
      } else {
        user.permissions = normalizePermissionList(user.permissions);
      }

      if (typeof user.email === 'string') {
        user.email = user.email.trim().toLowerCase();
      }
    },
    async beforeCreate(user) {
      user.password = await bcrypt.hash(user.password, 12);
    },
    async beforeUpdate(user) {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
  },
});

User.prototype.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toSafeJSON = function toSafeJSON() {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

export default User;
