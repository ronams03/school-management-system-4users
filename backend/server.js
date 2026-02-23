import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { connectDatabase } from './config/database.js';
import { syncDatabase } from './models/index.js';
import authRoutes from './routes/auth.js';
import studentsRoutes from './routes/students.js';
import adminRoutes from './routes/admin.js';
import eyeScanRoutes from './routes/eyescan.js';
import teachersRoutes from './routes/teachers.js';
import departmentsRoutes from './routes/departments.js';
import coursesRoutes from './routes/courses.js';
import enrollmentRoutes from './routes/enrollment.js';
import attendanceRoutes from './routes/attendance.js';
import reportsRoutes from './routes/reports.js';
import academicRoutes from './routes/academic.js';

dotenv.config({ override: true });

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/eyescan', eyeScanRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/enrollment', enrollmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/academic', academicRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

app.use((error, _req, res, _next) => {
  return res.status(500).json({
    success: false,
    message: error.message || 'Internal server error',
  });
});

const startServer = async () => {
  try {
    await connectDatabase();
    await syncDatabase();
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
