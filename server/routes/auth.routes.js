const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const {
  loginValidation,
  login,
  logout,
  refresh,
  getMe,
} = require('../controllers/auth.controller');

const router = express.Router();

// Public
router.post('/login', loginValidation, login);
router.post('/refresh', refresh);

// Protected
router.post('/logout', verifyToken, logout);
router.get('/me', verifyToken, getMe);

module.exports = router;
