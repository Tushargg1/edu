/**
 * Middleware: schoolScope
 *
 * Injects `req.schoolFilter` for use in all downstream DB queries to enforce
 * data isolation between schools.
 *
 * - For super_admin: sets `req.schoolFilter = {}` (no school-level filtering)
 * - For all other roles: sets `req.schoolFilter = { schoolCode: req.user.schoolCode }`
 *
 * IMPORTANT: The schoolCode is always taken from the authenticated user's JWT
 * token (req.user.schoolCode). Any client-supplied schoolCode in query params
 * or request body is ignored to prevent cross-school data access.
 *
 * Must run AFTER verifyToken so that req.user is available.
 */
function schoolScope(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required before school scoping',
      },
    });
  }

  if (req.user.role === 'super_admin') {
    req.schoolFilter = {};
  } else {
    req.schoolFilter = { schoolCode: req.user.schoolCode };
  }

  next();
}

module.exports = { schoolScope };
