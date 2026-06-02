const { body, param, query, validationResult } = require('express-validator');
const crypto = require('crypto');
const School = require('../models/School.model');
const User = require('../models/User.model');
const { generateSchoolCode } = require('../services/id.service');
const { sendCredentialNotification } = require('../services/notification.service');
const {
  successResponse,
  errorResponse,
  ERROR_CODES,
} = require('../utils/responseHandler');

/**
 * Validation rules for the register endpoint.
 */
const registerValidation = [
  body('name').trim().notEmpty().withMessage('School name is required'),
  body('board').trim().notEmpty().withMessage('Board affiliation is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('totalStudents')
    .isInt({ min: 1 })
    .withMessage('Total students must be a positive integer'),
  body('contactName').trim().notEmpty().withMessage('Contact name is required'),
  body('contactEmail')
    .trim()
    .notEmpty()
    .withMessage('Contact email is required')
    .isEmail()
    .withMessage('Contact email must be a valid email'),
  body('contactPhone')
    .trim()
    .notEmpty()
    .withMessage('Contact phone is required'),
];

/**
 * Validation rules for the approve endpoint.
 */
const approveValidation = [
  param('id').isMongoId().withMessage('Invalid school ID'),
  body('abbreviation')
    .trim()
    .notEmpty()
    .withMessage('Abbreviation is required for code generation'),
  body('cityCode')
    .trim()
    .notEmpty()
    .withMessage('City code is required for code generation'),
];

/**
 * Validation rules for the reject endpoint.
 */
const rejectValidation = [
  param('id').isMongoId().withMessage('Invalid school ID'),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Rejection reason is required'),
];

/**
 * POST /api/schools/register
 * Submit a school registration. Creates a pending School record.
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
async function register(req, res, next) {
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

    const {
      name,
      board,
      address,
      totalStudents,
      contactName,
      contactEmail,
      contactPhone,
      abbreviation,
      cityCode,
    } = req.body;

    // Check duplicate name + address
    const existing = await School.findOne({ name, address });
    if (existing) {
      return errorResponse(
        res,
        ERROR_CODES.DUPLICATE_ENTRY,
        'A school with this name and address already exists',
        null,
        409
      );
    }

    const school = await School.create({
      name,
      board,
      address,
      totalStudents,
      contactName,
      contactEmail,
      contactPhone,
      abbreviation: abbreviation || undefined,
      cityCode: cityCode || undefined,
      status: 'pending',
    });

    return successResponse(res, { school }, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/schools
 * List schools filtered by status query param. Scoped to super_admin.
 * Requirements: 2.1
 */
async function listSchools(req, res, next) {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const schools = await School.find(filter).sort({ createdAt: -1 });
    return successResponse(res, { schools });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/schools/:id/approve
 * Approve a school registration:
 * 1. Find school by MongoDB _id
 * 2. Generate schoolCode using generateSchoolCode(abbreviation, cityCode)
 * 3. Generate a temp password (random 8 chars)
 * 4. Create a User with role 'school_admin', userId = schoolCode + '-admin'
 * 5. Update School record with schoolCode, status='approved', adminUserId
 * 6. Send credentials via notification service
 * Requirements: 2.2, 2.3, 2.5
 */
async function approveSchool(req, res, next) {
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

    const { id } = req.params;
    const { abbreviation, cityCode } = req.body;

    const school = await School.findById(id);
    if (!school) {
      return errorResponse(
        res,
        ERROR_CODES.NOT_FOUND,
        'School not found',
        null,
        404
      );
    }

    if (school.status !== 'pending') {
      return errorResponse(
        res,
        ERROR_CODES.VALIDATION_ERROR,
        `School is already ${school.status}`,
        null,
        400
      );
    }

    // Generate school code
    const schoolCode = await generateSchoolCode(abbreviation, cityCode);

    // Generate temp password (8 random alphanumeric chars)
    const tempPassword = crypto.randomBytes(4).toString('hex');

    // Create school_admin user
    const adminUserId = `${schoolCode}-admin`;
    const adminUser = await User.create({
      userId: adminUserId,
      schoolCode,
      role: 'school_admin',
      password: tempPassword,
      name: school.contactName,
      email: school.contactEmail,
      phone: school.contactPhone,
    });

    // Update school record
    school.schoolCode = schoolCode;
    school.abbreviation = abbreviation.toUpperCase();
    school.cityCode = cityCode.toUpperCase();
    school.status = 'approved';
    school.adminUserId = adminUserId;
    await school.save();

    // Send credentials via notification service (fire and forget)
    sendCredentialNotification(
      adminUserId,
      { id: adminUserId, password: tempPassword },
      ['email']
    ).catch((err) => {
      console.error('Failed to send credential notification:', err.message);
    });

    return successResponse(res, {
      school,
      adminUserId,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/schools/:id/reject
 * Reject a school registration with a reason.
 * Requirements: 2.4
 */
async function rejectSchool(req, res, next) {
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

    const { id } = req.params;
    const { reason } = req.body;

    const school = await School.findById(id);
    if (!school) {
      return errorResponse(
        res,
        ERROR_CODES.NOT_FOUND,
        'School not found',
        null,
        404
      );
    }

    if (school.status !== 'pending') {
      return errorResponse(
        res,
        ERROR_CODES.VALIDATION_ERROR,
        `School is already ${school.status}`,
        null,
        400
      );
    }

    school.status = 'rejected';
    school.rejectionReason = reason;
    await school.save();

    return successResponse(res, { school });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/schools/:code
 * Return school by schoolCode (school-scoped).
 * Requirements: 1.1
 */
async function getSchool(req, res, next) {
  try {
    const { code } = req.params;

    const school = await School.findOne({
      schoolCode: code,
      ...req.schoolFilter,
    });

    if (!school) {
      return errorResponse(
        res,
        ERROR_CODES.NOT_FOUND,
        'School not found',
        null,
        404
      );
    }

    return successResponse(res, { school });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/schools/:code
 * Update school details (school-scoped).
 * Requirements: 1.1
 */
async function updateSchool(req, res, next) {
  try {
    const { code } = req.params;

    // Only allow updating certain fields
    const allowedFields = [
      'name',
      'board',
      'address',
      'totalStudents',
      'contactName',
      'contactEmail',
      'contactPhone',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const school = await School.findOneAndUpdate(
      { schoolCode: code, ...req.schoolFilter },
      updates,
      { new: true, runValidators: true }
    );

    if (!school) {
      return errorResponse(
        res,
        ERROR_CODES.NOT_FOUND,
        'School not found',
        null,
        404
      );
    }

    return successResponse(res, { school });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  registerValidation,
  approveValidation,
  rejectValidation,
  register,
  listSchools,
  approveSchool,
  rejectSchool,
  getSchool,
  updateSchool,
};
