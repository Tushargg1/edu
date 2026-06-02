const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const { parse } = require('csv-parse/sync');
const Student = require('../models/Student.model');
const User = require('../models/User.model');
const { generateStudentId } = require('../services/id.service');
const { sendCredentialNotification } = require('../services/notification.service');
const {
  successResponse,
  errorResponse,
  ERROR_CODES,
} = require('../utils/responseHandler');

/**
 * Validation rules for the createStudent endpoint.
 */
const createStudentValidation = [
  body('name').trim().notEmpty().withMessage('Student name is required'),
  body('class').trim().notEmpty().withMessage('Class is required'),
  body('section').trim().notEmpty().withMessage('Section is required'),
  body('rollNumber').trim().notEmpty().withMessage('Roll number is required'),
  body('dob').notEmpty().withMessage('Date of birth is required'),
  body('gender')
    .trim()
    .notEmpty()
    .withMessage('Gender is required')
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  body('parentName').trim().notEmpty().withMessage('Parent name is required'),
  body('parentPhone').trim().notEmpty().withMessage('Parent phone is required'),
  body('parentEmail')
    .trim()
    .notEmpty()
    .withMessage('Parent email is required')
    .isEmail()
    .withMessage('Parent email must be a valid email'),
  body('admissionYear')
    .notEmpty()
    .withMessage('Admission year is required')
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Admission year must be a valid year'),
];

/**
 * POST /api/students
 * Create a new student account with auto-generated ID.
 * Requirements: 6.1, 6.2, 6.3, 6.6
 */
async function createStudent(req, res, next) {
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
      class: studentClass,
      section,
      rollNumber,
      dob,
      gender,
      parentName,
      parentPhone,
      parentEmail,
      admissionYear,
    } = req.body;
    const schoolCode = req.user.schoolCode;

    // Check duplicate rollNumber within class+section+school
    const existingStudent = await Student.findOne({
      schoolCode,
      class: studentClass,
      section,
      rollNumber,
      ...req.schoolFilter,
    });
    if (existingStudent) {
      return errorResponse(
        res,
        ERROR_CODES.DUPLICATE_ENTRY,
        'A student with this roll number already exists in this class and section',
        null,
        409
      );
    }

    // Generate student ID
    const studentId = await generateStudentId(schoolCode, admissionYear);

    // Generate temp password (8 random alphanumeric chars)
    const tempPassword = crypto.randomBytes(4).toString('hex');

    // Create User record with role: student
    const user = await User.create({
      userId: studentId,
      schoolCode,
      role: 'student',
      password: tempPassword,
      name,
      email: parentEmail,
      phone: parentPhone,
    });

    // Create Student record
    const student = await Student.create({
      studentId,
      schoolCode,
      userId: user._id,
      name,
      class: studentClass,
      section,
      rollNumber,
      dob,
      gender,
      parentName,
      parentPhone,
      parentEmail,
      admissionYear,
    });

    // Send credentials via notification service (fire and forget)
    sendCredentialNotification(
      studentId,
      { id: studentId, password: tempPassword },
      ['email', 'sms']
    ).catch((err) => {
      console.error('Failed to send student credential notification:', err.message);
    });

    return successResponse(res, { student, studentId }, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * Validates a single student row from CSV data.
 * Returns an object with { valid: boolean, errors: string[], data: object }.
 */
function validateStudentRow(row, rowNumber) {
  const errors = [];
  const requiredFields = [
    'name',
    'class',
    'section',
    'rollNumber',
    'dob',
    'gender',
    'parentName',
    'parentPhone',
    'parentEmail',
    'admissionYear',
  ];

  for (const field of requiredFields) {
    if (!row[field] || String(row[field]).trim() === '') {
      errors.push(`Row ${rowNumber}: ${field} is required`);
    }
  }

  if (row.gender && !['male', 'female', 'other'].includes(row.gender.toLowerCase())) {
    errors.push(`Row ${rowNumber}: gender must be male, female, or other`);
  }

  if (row.admissionYear) {
    const year = parseInt(row.admissionYear, 10);
    if (isNaN(year) || year < 2000 || year > 2100) {
      errors.push(`Row ${rowNumber}: admissionYear must be a valid year between 2000 and 2100`);
    }
  }

  if (row.parentEmail && row.parentEmail.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(row.parentEmail.trim())) {
      errors.push(`Row ${rowNumber}: parentEmail must be a valid email`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    data: {
      name: row.name ? String(row.name).trim() : '',
      class: row.class ? String(row.class).trim() : '',
      section: row.section ? String(row.section).trim() : '',
      rollNumber: row.rollNumber ? String(row.rollNumber).trim() : '',
      dob: row.dob ? row.dob.trim() : '',
      gender: row.gender ? row.gender.toLowerCase().trim() : '',
      parentName: row.parentName ? String(row.parentName).trim() : '',
      parentPhone: row.parentPhone ? String(row.parentPhone).trim() : '',
      parentEmail: row.parentEmail ? String(row.parentEmail).trim() : '',
      admissionYear: row.admissionYear ? parseInt(row.admissionYear, 10) : null,
    },
  };
}

/**
 * POST /api/students/bulk
 * Bulk create students from CSV data.
 * Requirements: 6.4, 6.5
 */
async function bulkCreateStudents(req, res, next) {
  try {
    const schoolCode = req.user.schoolCode;

    // Accept CSV as raw text body or as a csvData string field in JSON body
    let csvText;
    if (typeof req.body === 'string') {
      csvText = req.body;
    } else if (req.body && req.body.csvData) {
      csvText = req.body.csvData;
    } else {
      return errorResponse(
        res,
        ERROR_CODES.VALIDATION_ERROR,
        'CSV data is required. Send as raw text body or as csvData field in JSON.',
        null,
        400
      );
    }

    // Parse CSV
    let rows;
    try {
      rows = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (parseErr) {
      return errorResponse(
        res,
        ERROR_CODES.VALIDATION_ERROR,
        `CSV parsing error: ${parseErr.message}`,
        null,
        400
      );
    }

    if (rows.length === 0) {
      return errorResponse(
        res,
        ERROR_CODES.VALIDATION_ERROR,
        'CSV file contains no data rows',
        null,
        400
      );
    }

    const successResults = [];
    const errorResults = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // +2 because row 1 is header, data starts at row 2
      const validation = validateStudentRow(rows[i], rowNumber);

      if (!validation.valid) {
        errorResults.push(...validation.errors);
        continue;
      }

      const data = validation.data;

      try {
        // Check duplicate rollNumber within class+section+school
        const existingStudent = await Student.findOne({
          schoolCode,
          class: data.class,
          section: data.section,
          rollNumber: data.rollNumber,
        });
        if (existingStudent) {
          errorResults.push(
            `Row ${rowNumber}: Duplicate roll number ${data.rollNumber} in class ${data.class} section ${data.section}`
          );
          continue;
        }

        // Generate student ID
        const studentId = await generateStudentId(schoolCode, data.admissionYear);

        // Generate temp password
        const tempPassword = crypto.randomBytes(4).toString('hex');

        // Create User record
        const user = await User.create({
          userId: studentId,
          schoolCode,
          role: 'student',
          password: tempPassword,
          name: data.name,
          email: data.parentEmail,
          phone: data.parentPhone,
        });

        // Create Student record
        const student = await Student.create({
          studentId,
          schoolCode,
          userId: user._id,
          name: data.name,
          class: data.class,
          section: data.section,
          rollNumber: data.rollNumber,
          dob: data.dob,
          gender: data.gender,
          parentName: data.parentName,
          parentPhone: data.parentPhone,
          parentEmail: data.parentEmail,
          admissionYear: data.admissionYear,
        });

        // Send credentials (fire and forget)
        sendCredentialNotification(
          studentId,
          { id: studentId, password: tempPassword },
          ['email', 'sms']
        ).catch((err) => {
          console.error(`Failed to send credential notification for ${studentId}:`, err.message);
        });

        successResults.push({ studentId, name: data.name, rollNumber: data.rollNumber });
      } catch (err) {
        errorResults.push(`Row ${rowNumber}: ${err.message}`);
      }
    }

    return successResponse(res, {
      summary: {
        total: rows.length,
        success: successResults.length,
        failed: errorResults.length,
      },
      created: successResults,
      errors: errorResults,
    }, 200);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/students
 * List students filtered by schoolCode, optional class/section query params.
 * Requirements: 6.1
 */
async function listStudents(req, res, next) {
  try {
    const filter = { ...req.schoolFilter };

    // Optional class/section query params
    if (req.query.class) {
      filter.class = req.query.class;
    }
    if (req.query.section) {
      filter.section = req.query.section;
    }

    const students = await Student.find(filter).sort({ createdAt: -1 });
    return successResponse(res, { students });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/students/:id
 * Return student by studentId (school-scoped).
 * Requirements: 6.1
 */
async function getStudent(req, res, next) {
  try {
    const { id } = req.params;

    const student = await Student.findOne({
      studentId: id,
      ...req.schoolFilter,
    });

    if (!student) {
      return errorResponse(
        res,
        ERROR_CODES.NOT_FOUND,
        'Student not found',
        null,
        404
      );
    }

    return successResponse(res, { student });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/students/:id
 * Update student fields (school-scoped).
 * Requirements: 6.1
 */
async function updateStudent(req, res, next) {
  try {
    const { id } = req.params;

    // Only allow updating certain fields
    const allowedFields = [
      'name',
      'class',
      'section',
      'rollNumber',
      'dob',
      'gender',
      'parentName',
      'parentPhone',
      'parentEmail',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const student = await Student.findOneAndUpdate(
      { studentId: id, ...req.schoolFilter },
      updates,
      { returnDocument: 'after', runValidators: true }
    );

    if (!student) {
      return errorResponse(
        res,
        ERROR_CODES.NOT_FOUND,
        'Student not found',
        null,
        404
      );
    }

    return successResponse(res, { student });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/students/:id
 * Deactivate student — set isActive false on Student and User records.
 * Requirements: 6.1
 */
async function deactivateStudent(req, res, next) {
  try {
    const { id } = req.params;

    const student = await Student.findOne({
      studentId: id,
      ...req.schoolFilter,
    });

    if (!student) {
      return errorResponse(
        res,
        ERROR_CODES.NOT_FOUND,
        'Student not found',
        null,
        404
      );
    }

    // Deactivate Student record
    student.isActive = false;
    await student.save();

    // Deactivate corresponding User record
    await User.findByIdAndUpdate(student.userId, { isActive: false });

    return successResponse(res, { student });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createStudentValidation,
  createStudent,
  bulkCreateStudents,
  listStudents,
  getStudent,
  updateStudent,
  deactivateStudent,
  validateStudentRow,
};
