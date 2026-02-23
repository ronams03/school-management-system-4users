import express from 'express';
import { authenticate, generateToken } from '../middleware/auth.js';
import { EyeScannerService } from '../utils/eyeScanner.js';
import { resolveUserPermissions } from '../utils/permissions.js';
import {
  AcademicYear,
  Department,
  EyeScan,
  Student,
  Teacher,
  User,
} from '../models/index.js';

const router = express.Router();

const getProfileByRole = async (user) => {
  if (user.role === 'student') {
    return Student.findOne({
      where: { userId: user.id },
      include: [
        { model: Department, as: 'department' },
        { model: AcademicYear, as: 'academicYear' },
      ],
    });
  }

  if (user.role === 'teacher') {
    return Teacher.findOne({
      where: { userId: user.id },
      include: [{ model: Department, as: 'department' }],
    });
  }

  return null;
};

// Login with email/password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ where: { email: String(email).toLowerCase().trim() } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);
    const profile = await getProfileByRole(user);
    const safeUser = user.toSafeJSON();
    safeUser.permissions = resolveUserPermissions(user);

    return res.json({
      success: true,
      data: {
        token,
        user: safeUser,
        profile,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Login with eye scan
router.post('/login/eyescan', async (req, res) => {
  try {
    const { scanData } = req.body;
    if (!scanData) {
      return res.status(400).json({ success: false, message: 'No scan data provided' });
    }

    const eyeScans = await EyeScan.findAll({
      where: { isActive: true },
      include: [{ model: User, as: 'user' }],
    });

    let matchedUser = null;
    let matchedEyeScan = null;
    let bestConfidence = 0;

    for (const scan of eyeScans) {
      const result = await EyeScannerService.verifyScan(scanData, scan.irisTemplate);
      if (result.verified && result.confidence > bestConfidence && scan.user?.isActive) {
        bestConfidence = result.confidence;
        matchedUser = scan.user;
        matchedEyeScan = scan;
      }
    }

    if (!matchedUser) {
      return res.status(401).json({ success: false, message: 'Eye scan not recognized' });
    }

    matchedUser.lastLogin = new Date();
    await matchedUser.save();

    if (matchedEyeScan) {
      matchedEyeScan.lastUsed = new Date();
      await matchedEyeScan.save();
    }

    const token = generateToken(matchedUser);
    const profile = await getProfileByRole(matchedUser);
    const safeUser = matchedUser.toSafeJSON();
    safeUser.permissions = resolveUserPermissions(matchedUser);

    return res.json({
      success: true,
      data: {
        token,
        user: safeUser,
        profile,
        scanConfidence: bestConfidence,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const profile = await getProfileByRole(req.user);
    const eyeScan = await EyeScan.findOne({ where: { userId: req.user.id, isActive: true } });
    const safeUser = req.user.toSafeJSON();
    safeUser.permissions = resolveUserPermissions(req.user);

    return res.json({
      success: true,
      data: {
        user: safeUser,
        profile,
        eyeScanEnrolled: Boolean(eyeScan),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Change password
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
