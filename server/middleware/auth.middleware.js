const { verifyAccessToken } = require('../utils/jwtHelper');

/**
 * Middleware: verifyToken
 * Extracts Bearer token from the Authorization header, decodes the JWT,
 * and attaches req.user = { userId, role, schoolCode, name }.
 * Returns 401 on missing or invalid token.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access token is missing or malformed',
      },
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      schoolCode: decoded.schoolCode,
      name: decoded.name,
    };
    next();
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED';
    const message =
      err.name === 'TokenExpiredError'
        ? 'Access token has expired'
        : 'Invalid access token';

    return res.status(401).json({
      success: false,
      error: { code, message },
    });
  }
}

/**
 * Middleware factory: requireRole
 * Returns middleware that checks req.user.role against the provided allowed roles.
 * Returns 403 if the user's role is not in the allowed list.
 * @param  {...string} roles - Allowed roles
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource',
        },
      });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
