const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { schoolScope } = require('../middleware/school.middleware');
const {
  submitAttendanceValidation,
  updateAttendanceValidation,
  submitAttendance,
  getAttendance,
  getStudentAttendance,
  updateAttendance,
  getClassReport,
} = require('../controllers/attendance.controller');

const router = express.Router();

router.use(verifyToken, schoolScope);

// Teachers mark/update attendance.
router.post(
  '/',
  requireRole('teacher'),
  submitAttendanceValidation,
  submitAttendance
);
router.patch(
  '/:id',
  requireRole('teacher'),
  updateAttendanceValidation,
  updateAttendance
);

// Reads available to staff (teacher + school_admin).
router.get('/', requireRole('teacher', 'school_admin'), getAttendance);
router.get(
  '/student/:id',
  requireRole('teacher', 'school_admin', 'student'),
  getStudentAttendance
);
router.get(
  '/report/:class',
  requireRole('teacher', 'school_admin'),
  getClassReport
);

module.exports = router;
