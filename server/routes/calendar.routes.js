const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { schoolScope } = require('../middleware/school.middleware');
const {
  createEventValidation,
  updateEventValidation,
  createEvent,
  listEvents,
  updateEvent,
  deleteEvent,
} = require('../controllers/calendar.controller');

const router = express.Router();

router.use(verifyToken, schoolScope);

// Any authenticated school user can view the calendar.
router.get('/', listEvents);

// Only school admins manage events.
router.post('/', requireRole('school_admin'), createEventValidation, createEvent);
router.put('/:id', requireRole('school_admin'), updateEventValidation, updateEvent);
router.delete('/:id', requireRole('school_admin'), deleteEvent);

module.exports = router;
