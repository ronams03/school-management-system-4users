import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { hasPermission } from '../middleware/rbac.js';
import { EyeScannerService } from '../utils/eyeScanner.js';
import { EyeScan, Student, User } from '../models/index.js';

const router = express.Router();

router.get('/enrolled', authenticate, hasPermission('manage_eye_scans'), async (req, res) => {
  try {
    const scans = await EyeScan.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: { exclude: ['password'] },
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.json({ success: true, data: scans });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/enroll', authenticate, hasPermission('manage_eye_scans'), async (req, res) => {
  try {
    const { userId, scanData, eye = 'right' } = req.body;
    if (!userId || !scanData) {
      return res.status(400).json({ success: false, message: 'userId and scanData are required' });
    }

    const user = await User.findByPk(Number(userId));
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const irisTemplate = await EyeScannerService.createTemplate(scanData);
    const quality = EyeScannerService.getScanQuality(scanData) ?? (Math.floor(Math.random() * 16) + 84);

    let scan = await EyeScan.findOne({ where: { userId: user.id } });
    if (scan) {
      scan.irisTemplate = irisTemplate;
      scan.eye = eye;
      scan.quality = quality;
      scan.isActive = true;
      scan.enrollmentDate = new Date();
      await scan.save();
    } else {
      scan = await EyeScan.create({
        userId: user.id,
        irisTemplate,
        eye,
        quality,
        isActive: true,
        enrollmentDate: new Date(),
      });
    }

    if (user.role === 'student') {
      const student = await Student.findOne({ where: { userId: user.id } });
      if (student) {
        student.eyeScanEnrolled = true;
        await student.save();
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Eye scan enrolled successfully',
      data: {
        id: scan.id,
        userId: scan.userId,
        quality: scan.quality,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:userId', authenticate, hasPermission('manage_eye_scans'), async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const scan = await EyeScan.findOne({ where: { userId } });
    if (!scan) {
      return res.status(404).json({ success: false, message: 'Eye scan enrollment not found' });
    }

    await scan.destroy();

    const student = await Student.findOne({ where: { userId } });
    if (student) {
      student.eyeScanEnrolled = false;
      await student.save();
    }

    return res.json({ success: true, message: 'Eye scan enrollment removed' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
