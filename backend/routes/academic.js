import express from 'express';
import { Op } from 'sequelize';
import { authenticate } from '../middleware/auth.js';
import { hasPermission } from '../middleware/rbac.js';
import { AcademicYear } from '../models/index.js';

const router = express.Router();

const canReadAcademicData = hasPermission(
  'manage_acad_year',
  'manage_students',
  'manage_enrollment',
  'view_reports'
);

router.get('/years', authenticate, canReadAcademicData, async (_req, res) => {
  try {
    const years = await AcademicYear.findAll({
      order: [['startDate', 'DESC'], ['createdAt', 'DESC']],
    });

    return res.json({ success: true, data: years });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/years/current', authenticate, canReadAcademicData, async (_req, res) => {
  try {
    const currentYear = await AcademicYear.findOne({ where: { isCurrent: true } });
    return res.json({ success: true, data: currentYear });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/semesters', authenticate, canReadAcademicData, async (_req, res) => {
  return res.json({
    success: true,
    data: [
      { id: 1, name: 'Semester 1' },
      { id: 2, name: 'Semester 2' },
    ],
  });
});

router.post('/years', authenticate, hasPermission('manage_acad_year'), async (req, res) => {
  try {
    const {
      name,
      startDate,
      endDate,
      isCurrent = false,
      isActive = true,
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }

    const duplicate = await AcademicYear.findOne({ where: { name: String(name).trim() } });
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Academic year name already exists' });
    }

    if (isCurrent) {
      await AcademicYear.update({ isCurrent: false }, { where: { isCurrent: true } });
    }

    const year = await AcademicYear.create({
      name: String(name).trim(),
      startDate: startDate || null,
      endDate: endDate || null,
      isCurrent: Boolean(isCurrent),
      isActive: Boolean(isActive),
    });

    return res.status(201).json({ success: true, data: year });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/years/:id', authenticate, hasPermission('manage_acad_year'), async (req, res) => {
  try {
    const year = await AcademicYear.findByPk(req.params.id);
    if (!year) {
      return res.status(404).json({ success: false, message: 'Academic year not found' });
    }

    const {
      name,
      startDate,
      endDate,
      isCurrent,
      isActive,
    } = req.body;

    if (name !== undefined) {
      const normalizedName = String(name).trim();
      if (normalizedName !== year.name) {
        const duplicate = await AcademicYear.findOne({
          where: {
            name: normalizedName,
            id: { [Op.ne]: year.id },
          },
        });
        if (duplicate) {
          return res.status(400).json({ success: false, message: 'Academic year name already exists' });
        }
        year.name = normalizedName;
      }
    }

    if (isCurrent !== undefined && Boolean(isCurrent)) {
      await AcademicYear.update({ isCurrent: false }, { where: { id: { [Op.ne]: year.id } } });
      year.isCurrent = true;
    } else if (isCurrent !== undefined) {
      year.isCurrent = false;
    }

    if (startDate !== undefined) year.startDate = startDate || null;
    if (endDate !== undefined) year.endDate = endDate || null;
    if (isActive !== undefined) year.isActive = Boolean(isActive);

    await year.save();
    return res.json({ success: true, data: year });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/years/:id/set-current', authenticate, hasPermission('manage_acad_year'), async (req, res) => {
  try {
    const year = await AcademicYear.findByPk(req.params.id);
    if (!year) {
      return res.status(404).json({ success: false, message: 'Academic year not found' });
    }

    await AcademicYear.update({ isCurrent: false }, { where: { id: { [Op.ne]: year.id } } });
    year.isCurrent = true;
    await year.save();

    return res.json({ success: true, data: year });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/years/:id', authenticate, hasPermission('manage_acad_year'), async (req, res) => {
  try {
    const year = await AcademicYear.findByPk(req.params.id);
    if (!year) {
      return res.status(404).json({ success: false, message: 'Academic year not found' });
    }

    year.isActive = false;
    if (year.isCurrent) {
      year.isCurrent = false;
    }
    await year.save();

    return res.json({ success: true, message: 'Academic year archived successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
