const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { schoolScope } = require('../middleware/school.middleware');
const {
  adminDashboard,
  teacherDashboard,
  studentDashboard,
} = require('../controllers/dashboard.controller');

const router = express.Router();

// Middleware attached per-route: verifyToken + requireRole + schoolScope.
router.get(
  '/admin',
  verifyToken,
  requireRole('school_admin'),
  schoolScope,
  adminDashboard
);
router.get(
  '/teacher',
  verifyToken,
  requireRole('teacher'),
  schoolScope,
  teacherDashboard
);
router.get(
  '/student',
  verifyToken,
  requireRole('student'),
  schoolScope,
  studentDashboard
);

module.exports = router;
