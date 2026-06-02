const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { schoolScope } = require('../middleware/school.middleware');
const {
  listNotifications,
  markAsRead,
} = require('../controllers/notification.controller');

const router = express.Router();

// Middleware attached per-route so each route carries verifyToken + schoolScope.
router.get('/', verifyToken, schoolScope, listNotifications);
router.patch('/:id/read', verifyToken, schoolScope, markAsRead);

module.exports = router;
