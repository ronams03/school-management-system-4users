# 👁️ EyeTrack - School Management System with Eye Scanner Attendance

A comprehensive school management system featuring biometric iris/eye scanner
attendance, role-based access control (RBAC), student management, course
enrollment, academic year management, student promotion, and detailed reporting.

## Features

### 🔐 Role-Based Access Control (RBAC)
- **Admin** — Full system access, user management, all configurations
- **School Head** — Manage students, teachers, courses, departments, promotions
- **Teacher** — Take attendance, view assigned courses, basic reports
- **Student** — View own attendance, enrolled courses, personal dashboard

### 👁️ Eye Scanner Attendance
- Iris pattern enrollment for students and teachers
- Biometric verification for check-in/check-out
- Real-time scanning interface with confidence scores
- Fallback manual attendance entry
- Scan quality validation

### 🎓 Student Management
- Full CRUD with search and filters
- Department and year-based organization
- Guardian information tracking
- Student promotion (individual and bulk)
- Promotion history tracking

### 📚 Course & Enrollment
- Course creation with schedules
- Teacher assignment
- Individual and bulk enrollment
- Enrollment status tracking (enrolled, dropped, completed, failed)
- Grade management

### 📊 Reports & Analytics
- Attendance reports with charts
- Department enrollment analytics
- Eye scan usage statistics
- Daily/weekly/monthly breakdowns
- Export-ready data views

### 📅 Academic Management
- Academic year configuration
- Semester management
- Current year/semester tracking

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend  | React 18, Tailwind CSS, Recharts, React Router v6 |
| Backend   | Node.js, Express.js |
| Database  | MongoDB with Mongoose |
| Auth      | JWT + bcrypt |
| Icons     | React Icons (Heroicons) |

## Quick Start

### Prerequisites
- Node.js 18+
- Mysql

### 1. Clone and Setup

```bash
git clone <repository>
cd school-management-system