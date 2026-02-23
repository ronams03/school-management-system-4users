import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { resolveUserPermissions } from '../utils/permissions.js';

const extractBearerToken = (header = '') => {
  if (!header.startsWith('Bearer ')) {
    return null;
  }

  return header.slice(7).trim();
};

export const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

export const authenticate = async (req, res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User is not authorized',
      });
    }

    req.user = user;
    req.user.permissions = resolveUserPermissions(user);

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token',
    });
  }
};
