const { body, param, validationResult } = require('express-validator');
const crypto = require('crypto');
const Teacher = require('../models/Teacher.model');
const User = require('../models/User.model');
const { generateTeacherId } = require('../services/id.service');
const { sendCredentialNotification } = require('../services/notification.service');
const {
  successResponse,
  errorResponse,
  ERROR_CODES,
} = require('../utils/responseHandler');

/**
 * Validation rules for the createTeacher endpoint.
 */
const createTeacherValidation = [
  body('name').trim().notEmpty().withMessage('Teacher name is required'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email must be a valid email'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('subjects')
    .isArray({ min: 1 })
    .withMessage('Subjects must be a non-empty array'),
  body('assignedClasses')
    .isArray({ min: 1 })
    .withMessage('Assigned classes must be a non-empty array'),
  body('assignedClasses.*.class')
    .trim()
    .notEmpty()
    .withMessage('Each assigned class must have a class field'),
  body('assignedClasses.*.section')
    .trim()
    .notEmpty()
    .withMessage('Each assigned class must have a section field'),
];

/**
 * Validation rules for the updateTeacher endpoint.
 */
const updateTeacherValidation = [
  param('id').trim().notEmpty().withMessage('Teacher ID is required'),
];

/**
 * POST /api/teachers
 * Create a new teacher account with auto-generated ID.
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
async function createTeacher(req, res, next) {
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

    const { name, email, phone, subjects, assignedClasses } = req.body;
    const schoolCode = req.user.schoolCode;

    // Check duplicate email within school
    const existingTeacher = await Teacher.findOne({
      schoolCode,
      email: email.toLowerCase(),
      ...req.schoolFilter,
    });
    if (existingTeacher) {
      return errorResponse(
        res,
        ERROR_CODES.DUPLICATE_ENTRY,
        'A teacher with this email already exists in this school',
        null,
        409
      );
    }

    // Generate teacher ID
    const teacherId = await generateTeacherId(schoolCode);

    // Generate temp password (8 random alphanumeric chars)
    const tempPassword = crypto.randomBytes(4).toString('hex');

    // Create User record with role: teacher
    const user = await User.create({
      userId: teacherId,
      schoolCode,
      role: 'teacher',
      password: tempPassword,
      name,
      email,
      phone,
    });

    // Create Teacher record
    const teacher = await Teacher.create({
      teacherId,
      schoolCode,
      userId: user._id,
      name,
      email,
      phone,
      subjects,
      assignedClasses,
    });

    // Send credentials via notification service (fire and forget)
    sendCredentialNotification(
      teacherId,
      { id: teacherId, password: tempPassword },
      ['email', 'sms']
    ).catch((err) => {
      console.error('Failed to send teacher credential notification:', err.message);
    });

    return successResponse(res, { teacher, teacherId }, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/teachers
 * List teachers filtered by schoolCode from schoolScope.
 * Requirements: 5.1
 */
async function listTeachers(req, res, next) {
  try {
    const teachers = await Teacher.find({ ...req.schoolFilter }).sort({
      createdAt: -1,
    });
    return successResponse(res, { teachers });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/teachers/:id
 * Return teacher by teacherId (school-scoped).
 * Requirements: 5.1
 */
async function getTeacher(req, res, next) {
  try {
    const { id } = req.params;

    const teacher = await Teacher.findOne({
      teacherId: id,
      ...req.schoolFilter,
    });

    if (!teacher) {
      return errorResponse(
        res,
        ERROR_CODES.NOT_FOUND,
        'Teacher not found',
        null,
        404
      );
    }

    return successResponse(res, { teacher });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/teachers/:id
 * Update teacher fields (school-scoped).
 * Requirements: 5.1
 */
async function updateTeacher(req, res, next) {
  try {
    const { id } = req.params;

    // Only allow updating certain fields
    const allowedFields = [
      'name',
      'phone',
      'subjects',
      'assignedClasses',
      'isClassTeacher',
      'classTeacherOf',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const teacher = await Teacher.findOneAndUpdate(
      { teacherId: id, ...req.schoolFilter },
      updates,
      { returnDocument: 'after', runValidators: true }
    );

    if (!teacher) {
      return errorResponse(
        res,
        ERROR_CODES.NOT_FOUND,
        'Teacher not found',
        null,
        404
      );
    }

    return successResponse(res, { teacher });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/teachers/:id
 * Deactivate teacher — set isActive false on Teacher and User records.
 * Requirements: 5.1
 */
async function deactivateTeacher(req, res, next) {
  try {
    const { id } = req.params;

    const teacher = await Teacher.findOne({
      teacherId: id,
      ...req.schoolFilter,
    });

    if (!teacher) {
      return errorResponse(
        res,
        ERROR_CODES.NOT_FOUND,
        'Teacher not found',
        null,
        404
      );
    }

    // Deactivate Teacher record
    teacher.isActive = false;
    await teacher.save();

    // Deactivate corresponding User record
    await User.findByIdAndUpdate(teacher.userId, { isActive: false });

    return successResponse(res, { teacher });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTeacherValidation,
  updateTeacherValidation,
  createTeacher,
  listTeachers,
  getTeacher,
  updateTeacher,
  deactivateTeacher,
};
