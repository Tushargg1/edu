const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { schoolScope } = require('../middleware/school.middleware');
const {
  createStudentValidation,
  createStudent,
  bulkCreateStudents,
  listStudents,
  getStudent,
  updateStudent,
  deactivateStudent,
} = require('../controllers/student.controller');

const router = express.Router();

// Student management is school-admin only, scoped to their school.
router.use(verifyToken, requireRole('school_admin'), schoolScope);

// Accept raw CSV text bodies for the bulk endpoint.
router.post(
  '/bulk',
  express.text({ type: ['text/csv', 'text/plain'] }),
  bulkCreateStudents
);

router.post('/', createStudentValidation, createStudent);
router.get('/', listStudents);
router.get('/:id', getStudent);
router.put('/:id', updateStudent);
router.delete('/:id', deactivateStudent);

module.exports = router;
