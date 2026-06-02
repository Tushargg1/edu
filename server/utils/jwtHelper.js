const jwt = require('jsonwebtoken');

/**
 * JWT helpers for issuing and verifying access & refresh tokens.
 *
 * Access tokens:  signed with JWT_SECRET,         expire in 15 minutes.
 * Refresh tokens: signed with JWT_REFRESH_SECRET, expire in 7 days.
 * Both use the HS256 algorithm.
 *
 * Secrets are read from the environment at call time so tests can set them
 * in a `beforeAll` hook.
 */

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    algorithm: 'HS256',
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
