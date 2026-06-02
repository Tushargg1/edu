const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { schoolScope } = require('../middleware/school.middleware');
const {
  registerValidation,
  approveValidation,
  rejectValidation,
  register,
  listSchools,
  approveSchool,
  rejectSchool,
  getSchool,
  updateSchool,
} = require('../controllers/school.controller');

const router = express.Router();

// Public registration
router.post('/register', registerValidation, register);

// Super-admin only
router.get('/', verifyToken, requireRole('super_admin'), listSchools);
router.patch(
  '/:id/approve',
  verifyToken,
  requireRole('super_admin'),
  approveValidation,
  approveSchool
);
router.patch(
  '/:id/reject',
  verifyToken,
  requireRole('super_admin'),
  rejectValidation,
  rejectSchool
);

// School-admin only (school-scoped)
router.get(
  '/:code',
  verifyToken,
  requireRole('school_admin'),
  schoolScope,
  getSchool
);
router.put(
  '/:code',
  verifyToken,
  requireRole('school_admin'),
  schoolScope,
  updateSchool
);

module.exports = router;
