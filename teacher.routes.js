const { body, validationResult } = require('express-validator');
const User = require('../models/User.model');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/jwtHelper');
const {
  successResponse,
  errorResponse,
  ERROR_CODES,
} = require('../utils/responseHandler');

/**
 * Validation rules for the login endpoint.
 */
const loginValidation = [
  body('userId').trim().notEmpty().withMessage('userId is required'),
  body('password').notEmpty().withMessage('password is required'),
];

/**
 * POST /api/auth/login
 * Validate userId + password, issue access + refresh tokens.
 * Requirements: 3.1, 3.2, 3.3
 */
async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const fields = errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      }));
      return errorResponse(
        res,
        ERROR_CODES.VALIDATION_ERROR,
        'Validation failed',
        fields,
        400
      );
    }

    const { userId, password } = req.body;

    const user = await User.findOne({ userId });
    if (!user) {
      return errorResponse(
        res,
        ERROR_CODES.INVALID_CREDENTIALS,
        'Invalid credentials',
        null,
        401
      );
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return errorResponse(
        res,
        ERROR_CODES.INVALID_CREDENTIALS,
        'Invalid credentials',
        null,
        401
      );
    }

    const tokenPayload = {
      userId: user.userId,
      role: user.role,
      schoolCode: user.schoolCode,
      name: user.name,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Persist refresh token on the User record
    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    });

    return successResponse(res, {
      accessToken,
      user: {
        userId: user.userId,
        role: user.role,
        schoolCode: user.schoolCode,
        name: user.name,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Clear refresh token from User record and clear httpOnly cookie.
 * Requirements: 3.6
 */
async function logout(req, res, next) {
  try {
    await User.findOneAndUpdate(
      { userId: req.user.userId },
      { refreshToken: null }
    );

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return successResponse(res, { message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/refresh
 * Read refresh token from cookie, verify, issue new access token.
 * Requirements: 3.4, 3.5
 */
async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return errorResponse(
        res,
        ERROR_CODES.UNAUTHORIZED,
        'Refresh token is missing',
        null,
        401
      );
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      return errorResponse(
        res,
        ERROR_CODES.TOKEN_EXPIRED,
        'Refresh token is invalid or expired',
        null,
        401
      );
    }

    const user = await User.findOne({ userId: decoded.userId });
    if (!user || user.refreshToken !== token) {
      return errorResponse(
        res,
        ERROR_CODES.UNAUTHORIZED,
        'Refresh token is invalid',
        null,
        401
      );
    }

    const tokenPayload = {
      userId: user.userId,
      role: user.role,
      schoolCode: user.schoolCode,
      name: user.name,
    };

    const accessToken = generateAccessToken(tokenPayload);

    return successResponse(res, { accessToken });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Return current user from req.user (set by verifyToken middleware).
 * Requirements: 3.1
 */
async function getMe(req, res, next) {
  try {
    return successResponse(res, { user: req.user });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  loginValidation,
  login,
  logout,
  refresh,
  getMe,
};
