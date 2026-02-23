import dotenv from 'dotenv';
import { Op } from 'sequelize';
import {
  AcademicYear,
  Department,
  Student,
  Teacher,
  User,
  sequelize,
  syncDatabase,
} from '../models/index.js';
import { getRolePermissions, RBAC_PERMISSION_MATRIX } from './permissions.js';
import { generateStudentId, generateTeacherId } from './helpers.js';

dotenv.config({ override: true });

const DEMO_USERS = [
  {
    email: 'admin@school.com',
    password: 'password123',
    firstName: 'System',
    lastName: 'Admin',
    role: 'admin',
  },
  {
    email: 'head@school.com',
    password: 'password123',
    firstName: 'School',
    lastName: 'Head',
    role: 'school_head',
  },
  {
    email: 'teacher@school.com',
    password: 'password123',
    firstName: 'Demo',
    lastName: 'Teacher',
    role: 'teacher',
  },
  {
    email: 'student@school.com',
    password: 'password123',
    firstName: 'Demo',
    lastName: 'Student',
    role: 'student',
  },
];

const upsertDemoUsers = async () => {
  const currentYear = new Date().getFullYear();
  const dept = await Department.findOrCreate({
    where: { code: 'GEN' },
    defaults: {
      name: 'General Studies',
      code: 'GEN',
      description: 'Default department created by seed',
      isActive: true,
    },
  }).then(([department]) => department);

  const currentAcademicYear = await AcademicYear.findOrCreate({
    where: { name: `${currentYear}-${currentYear + 1}` },
    defaults: {
      name: `${currentYear}-${currentYear + 1}`,
      startDate: `${currentYear}-06-01`,
      endDate: `${currentYear + 1}-05-31`,
      isCurrent: true,
      isActive: true,
    },
  }).then(([academicYear]) => academicYear);

  await AcademicYear.update(
    { isCurrent: false },
    { where: { id: { [Op.ne]: currentAcademicYear.id } } }
  );
  currentAcademicYear.isCurrent = true;
  await currentAcademicYear.save();

  for (const userSeed of DEMO_USERS) {
    const existingUser = await User.findOne({ where: { email: userSeed.email } });

    if (existingUser) {
      existingUser.firstName = userSeed.firstName;
      existingUser.lastName = userSeed.lastName;
      existingUser.password = userSeed.password;
      existingUser.role = userSeed.role;
      existingUser.permissions = getRolePermissions(userSeed.role);
      existingUser.isActive = true;
      await existingUser.save();
    } else {
      await User.create({
        ...userSeed,
        permissions: getRolePermissions(userSeed.role),
        isActive: true,
      });
    }

    const user = await User.findOne({ where: { email: userSeed.email } });
    if (!user) continue;

    if (user.role === 'student') {
      const existingStudent = await Student.findOne({ where: { userId: user.id } });
      if (!existingStudent) {
        await Student.create({
          userId: user.id,
          studentId: generateStudentId(dept.code, currentYear),
          dateOfBirth: `${currentYear - 18}-01-01`,
          gender: 'male',
          departmentId: dept.id,
          currentYear: 1,
          currentSemester: 1,
          academicYearId: currentAcademicYear.id,
          status: 'active',
        });
      }
    }

    if (user.role === 'teacher') {
      const existingTeacher = await Teacher.findOne({ where: { userId: user.id } });
      if (!existingTeacher) {
        await Teacher.create({
          userId: user.id,
          teacherId: generateTeacherId(dept.code),
          departmentId: dept.id,
          qualification: 'Masters',
          specialization: 'General Education',
          joiningDate: new Date(),
          isActive: true,
        });
      }
    }
  }
};

const logPermissionMatrix = () => {
  console.log('\nRBAC Permission Matrix');
  console.table(
    Object.entries(RBAC_PERMISSION_MATRIX).map(([role, permissions]) => ({
      role,
      permissions: permissions.join(', '),
    }))
  );
};

const seed = async () => {
  try {
    await syncDatabase();
    await upsertDemoUsers();
    logPermissionMatrix();
    console.log('\nSeed completed successfully.');
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

seed();
