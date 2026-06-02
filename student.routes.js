const { body, param, query, validationResult } = require('express-validator');
const Attendance = require('../models/Attendance.model');
const Teacher = require('../models/Teacher.model');
const Student = require('../models/Student.model');
const { sendAbsenceNotification } = require('../services/notification.service');
const {
  successResponse,
  errorResponse,
  ERROR_CODES,
} = require('../utils/responseHandler');

/**
 * Validation rules for the submitAttendance endpoint.
 */
const submitAttendanceValidation = [
  body('class').trim().notEmpty().withMessage('Class is required'),
  body('section').trim().notEmpty().withMessage('Section is required'),
  body('date').notEmpty().withMessage('Date is required').isISO8601().withMessage('Date must be a valid ISO 8601 date'),
  body('records')
    .isArray({ min: 1 })
    .withMessage('Records must be a non-empty array'),
  body('records.*.studentId')
    .trim()
    .notEmpty()
    .withMessage('Each record must have a studentId'),
  body('records.*.status')
    .trim()
    .notEmpty()
    .withMessage('Each record must have a status')
    .isIn(['present', 'absent', 'late'])
    .withMessage('Status must be present, absent, or late'),
];

/**
 * Validation rules for the updateAttendance endpoint.
 */
const updateAttendanceValidation = [
  body('records')
    .isArray({ min: 1 })
    .withMessage('Records must be a non-empty array'),
  body('records.*.studentId')
    .trim()
    .notEmpty()
    .withMessage('Each record must have a studentId'),
  body('records.*.status')
    .trim()
    .notEmpty()
    .withMessage('Each record must have a status')
    .isIn(['present', 'absent', 'late'])
    .withMessage('Status must be present, absent, or late'),
];

/**
 * Triggers absence notifications for absent students asynchronously.
 * Updates the notified flag on the attendance record after each notification.
 * @param {object} attendance - The attendance document
 * @param {string} schoolCode - The school code
 */
async function triggerAbsenceNotifications(attendance, schoolCode) {
  const absentRecords = attendance.records.filter(
    (r) => r.status === 'absent' && !r.notified
  );

  for (const record of absentRecords) {
    try {
      const student = await Student.findOne({
        studentId: record.studentId,
        schoolCode,
      });
      if (!student) continue;

      await sendAbsenceNotification(student, attendance.date);

      // Update notified flag on the record
      await Attendance.updateOne(
        { _id: attendance._id, 'records.studentId': record.studentId },
        { $set: { 'records.$.notified': true } }
      );
    } catch (err) {
      console.error(
        `Failed to send absence notification for student ${record.studentId}:`,
        err.message
      );
    }
  }
}

/**
 * POST /api/attendance
 * Submit attendance for a class-section-date. Upserts if record already exists.
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */
async function submitAttendance(req, res, next) {
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

    const { class: className, section, date, records } = req.body;
    const schoolCode = req.user.schoolCode;

    // Validate teacher is assigned to this class
    const teacher = await Teacher.findOne({
      userId: req.user._id,
      schoolCode,
      ...req.schoolFilter,
    });

    if (!teacher) {
      return errorResponse(
        res,
        ERROR_CODES.FORBIDDEN,
        'Teacher record not found',
        null,
        403
      );
    }

    const isAssigned = teacher.assignedClasses.some(
      (ac) => ac.class === className && ac.section === section
    );

    if (!isAssigned) {
      return errorResponse(
        res,
        ERROR_CODES.FORBIDDEN,
        'You are not assigned to this class and section',
        null,
        403
      );
    }

    // Normalize date to start of day
    const attendanceDate = new Date(date);
    attendanceDate.setUTCHours(0, 0, 0, 0);

    // Prepare records with notified default
    const attendanceRecords = records.map((r) => ({
      studentId: r.studentId,
      status: r.status,
      notified: false,
    }));

    // Upsert attendance record
    const attendance = await Attendance.findOneAndUpdate(
      {
        schoolCode,
        class: className,
        section,
        date: attendanceDate,
      },
      {
        schoolCode,
        class: className,
        section,
        date: attendanceDate,
        markedBy: req.user._id,
        records: attendanceRecords,
      },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );

    // Trigger absence notifications asynchronously (fire and forget)
    triggerAbsenceNotifications(attendance, schoolCode).catch((err) => {
      console.error('Failed to trigger absence notifications:', err.message);
    });

    return successResponse(res, { attendance }, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/attendance
 * Query attendance by class/section/date with schoolScope.
 * Requirements: 10.1
 */
async function getAttendance(req, res, next) {
  try {
    const filter = { ...req.schoolFilter };

    if (req.query.class) {
      filter.class = req.query.class;
    }
    if (req.query.section) {
      filter.section = req.query.section;
    }
    if (req.query.date) {
      const queryDate = new Date(req.query.date);
      queryDate.setUTCHours(0, 0, 0, 0);
      filter.date = queryDate;
    }

    const records = await Attendance.find(filter).sort({ date: -1 });
    return successResponse(res, { records });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/attendance/student/:id
 * Return month-by-month attendance history for a student.
 * Compute per-month and cumulative attendance percentage as (present + late) / total.
 * Requirements: 11.1
 */
async function getStudentAttendance(req, res, next) {
  try {
    const { id } = req.params;
    const schoolCode = req.schoolFilter.schoolCode || req.user.schoolCode;

    // Find all attendance records containing this student
    const attendanceRecords = await Attendance.find({
      ...req.schoolFilter,
      'records.studentId': id,
    }).sort({ date: 1 });

    // Build month-by-month history
    const monthMap = {};
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;

    for (const record of attendanceRecords) {
      const studentRecord = record.records.find((r) => r.studentId === id);
      if (!studentRecord) continue;

      const date = new Date(record.date);
      const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          month: monthKey,
          present: 0,
          absent: 0,
          late: 0,
          total: 0,
          days: [],
        };
      }

      const month = monthMap[monthKey];
      month.total++;

      if (studentRecord.status === 'present') {
        month.present++;
        totalPresent++;
      } else if (studentRecord.status === 'absent') {
        month.absent++;
        totalAbsent++;
      } else if (studentRecord.status === 'late') {
        month.late++;
        totalLate++;
      }

      month.days.push({
        date: record.date,
        status: studentRecord.status,
      });
    }

    // Compute per-month percentages
    const months = Object.values(monthMap).map((month) => ({
      ...month,
      percentage:
        month.total > 0
          ? Math.round(((month.present + month.late) / month.total) * 10000) / 100
          : 0,
    }));

    const totalDays = totalPresent + totalAbsent + totalLate;
    const cumulativePercentage =
      totalDays > 0
        ? Math.round(((totalPresent + totalLate) / totalDays) * 10000) / 100
        : 0;

    return successResponse(res, {
      studentId: id,
      months,
      cumulative: {
        present: totalPresent,
        absent: totalAbsent,
        late: totalLate,
        total: totalDays,
        percentage: cumulativePercentage,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/attendance/:id
 * Update existing attendance record, re-trigger notifications for newly absent students.
 * Requirements: 10.4
 */
async function updateAttendance(req, res, next) {
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
    const { records } = req.body;

    // Find existing attendance record
    const existing = await Attendance.findOne({
      _id: id,
      ...req.schoolFilter,
    });

    if (!existing) {
      return errorResponse(
        res,
        ERROR_CODES.NOT_FOUND,
        'Attendance record not found',
        null,
        404
      );
    }

    // Determine which students are newly absent (were not absent before)
    const previousAbsentIds = new Set(
      existing.records
        .filter((r) => r.status === 'absent')
        .map((r) => r.studentId)
    );

    // Update records, preserving notified flag for previously notified absent students
    const updatedRecords = records.map((r) => {
      const prevRecord = existing.records.find(
        (pr) => pr.studentId === r.studentId
      );
      return {
        studentId: r.studentId,
        status: r.status,
        // Keep notified true only if student was previously absent and notified
        notified:
          r.status === 'absent' &&
          prevRecord &&
          prevRecord.status === 'absent' &&
          prevRecord.notified
            ? true
            : false,
      };
    });

    existing.records = updatedRecords;
    existing.markedBy = req.user._id;
    await existing.save();

    // Trigger notifications for newly absent students (fire and forget)
    const schoolCode = existing.schoolCode;
    triggerAbsenceNotifications(existing, schoolCode).catch((err) => {
      console.error('Failed to trigger absence notifications on update:', err.message);
    });

    return successResponse(res, { attendance: existing });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/attendance/report/:class
 * Aggregate per-student totals (present, absent, late), compute percentage,
 * flag students below 75%.
 * Requirements: 11.2, 11.3
 */
async function getClassReport(req, res, next) {
  try {
    const { class: className } = req.params;
    const { section } = req.query;

    const filter = {
      ...req.schoolFilter,
      class: className,
    };

    if (section) {
      filter.section = section;
    }

    const attendanceRecords = await Attendance.find(filter);

    // Aggregate per-student totals
    const studentStats = {};

    for (const record of attendanceRecords) {
      for (const entry of record.records) {
        if (!studentStats[entry.studentId]) {
          studentStats[entry.studentId] = {
            studentId: entry.studentId,
            present: 0,
            absent: 0,
            late: 0,
            total: 0,
          };
        }

        const stats = studentStats[entry.studentId];
        stats.total++;

        if (entry.status === 'present') {
          stats.present++;
        } else if (entry.status === 'absent') {
          stats.absent++;
        } else if (entry.status === 'late') {
          stats.late++;
        }
      }
    }

    // Compute percentage and flag below 75%
    const report = Object.values(studentStats).map((stats) => {
      const percentage =
        stats.total > 0
          ? Math.round(((stats.present + stats.late) / stats.total) * 10000) / 100
          : 0;
      return {
        ...stats,
        percentage,
        belowThreshold: percentage < 75,
      };
    });

    return successResponse(res, {
      class: className,
      section: section || null,
      totalRecords: attendanceRecords.length,
      report,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitAttendanceValidation,
  updateAttendanceValidation,
  submitAttendance,
  getAttendance,
  getStudentAttendance,
  updateAttendance,
  getClassReport,
  triggerAbsenceNotifications,
};
