const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { schoolScope } = require('../middleware/school.middleware');
const {
  createTeacherValidation,
  updateTeacherValidation,
  createTeacher,
  listTeachers,
  getTeacher,
  updateTeacher,
  deactivateTeacher,
} = require('../controllers/teacher.controller');

const router = express.Router();

// All teacher management is school-admin only, scoped to their school.
router.use(verifyToken, requireRole('school_admin'), schoolScope);

router.post('/', createTeacherValidation, createTeacher);
router.get('/', listTeachers);
router.get('/:id', getTeacher);
router.put('/:id', updateTeacherValidation, updateTeacher);
router.delete('/:id', deactivateTeacher);

module.exports = router;
