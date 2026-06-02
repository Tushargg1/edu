const { body, validationResult } = require('express-validator');
const CalendarEvent = require('../models/CalendarEvent.model');
const { sendCalendarEventNotification } = require('../services/notification.service');
const {
  successResponse,
  errorResponse,
  ERROR_CODES,
} = require('../utils/responseHandler');

/**
 * Validation rules for creating a calendar event.
 */
const createEventValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('eventType')
    .trim()
    .notEmpty()
    .withMessage('Event type is required')
    .isIn(['Holiday', 'Exam', 'School_Event', 'PTM', 'Vacation'])
    .withMessage('Event type must be one of: Holiday, Exam, School_Event, PTM, Vacation'),
  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  body('description').optional().trim(),
];

/**
 * Validation rules for updating a calendar event.
 */
const updateEventValidation = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('eventType')
    .optional()
    .trim()
    .isIn(['Holiday', 'Exam', 'School_Event', 'PTM', 'Vacation'])
    .withMessage('Event type must be one of: Holiday, Exam, School_Event, PTM, Vacation'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  body('description').optional().trim(),
];

/**
 * POST /api/calendar
 * Create a new calendar event scoped to the admin's school.
 * Triggers calendar notification to all school users.
 * Requirements: 13.1, 13.4, 13.5, 15.1, 15.2
 */
async function createEvent(req, res, next) {
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

    const { title, eventType, startDate, endDate, description } = req.body;
    const schoolCode = req.user.schoolCode;

    // Validate startDate <= endDate
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      return errorResponse(
        res,
        ERROR_CODES.VALIDATION_ERROR,
        'Start date must be on or before end date',
        [{ field: 'startDate', message: 'Start date must be on or before end date' }],
        400
      );
    }

    const event = await CalendarEvent.create({
      schoolCode,
      title,
      eventType,
      startDate: start,
      endDate: end,
      description: description || null,
      createdBy: req.user._id,
    });

    // Trigger calendar notification asynchronously (fire and forget)
    sendCalendarEventNotification(event, schoolCode).catch((err) => {
      console.error('Failed to send calendar event notification:', err.message);
    });

    return successResponse(res, { event }, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/calendar
 * List calendar events filtered by schoolCode, with optional eventType and date range filters.
 * Requirements: 13.2, 14.1, 14.2
 */
async function listEvents(req, res, next) {
  try {
    const filter = { ...req.schoolFilter };

    if (req.query.eventType) {
      filter.eventType = req.query.eventType;
    }

    if (req.query.startDate || req.query.endDate) {
      filter.startDate = {};
      if (req.query.startDate) {
        filter.startDate.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.startDate.$lte = new Date(req.query.endDate);
      }
    }

    const events = await CalendarEvent.find(filter).sort({ startDate: 1 });
    return successResponse(res, { events });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/calendar/:id
 * Update an existing calendar event (school-scoped, admin only).
 * Requirements: 13.2
 */
async function updateEvent(req, res, next) {
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

    const event = await CalendarEvent.findOne({
      _id: id,
      ...req.schoolFilter,
    });

    if (!event) {
      return errorResponse(
        res,
        ERROR_CODES.NOT_FOUND,
        'Calendar event not found',
        null,
        404
      );
    }

    const allowedFields = ['title', 'eventType', 'startDate', 'endDate', 'description'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        event[field] = field === 'startDate' || field === 'endDate'
          ? new Date(req.body[field])
          : req.body[field];
      }
    }

    // Validate startDate <= endDate after applying updates
    if (event.startDate > event.endDate) {
      return errorResponse(
        res,
        ERROR_CODES.VALIDATION_ERROR,
        'Start date must be on or before end date',
        [{ field: 'startDate', message: 'Start date must be on or before end date' }],
        400
      );
    }

    await event.save();

    return successResponse(res, { event });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/calendar/:id
 * Remove a calendar event (school-scoped, admin only).
 * Requirements: 13.3
 */
async function deleteEvent(req, res, next) {
  try {
    const { id } = req.params;

    const event = await CalendarEvent.findOneAndDelete({
      _id: id,
      ...req.schoolFilter,
    });

    if (!event) {
      return errorResponse(
        res,
        ERROR_CODES.NOT_FOUND,
        'Calendar event not found',
        null,
        404
      );
    }

    return successResponse(res, { message: 'Calendar event deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createEventValidation,
  updateEventValidation,
  createEvent,
  listEvents,
  updateEvent,
  deleteEvent,
};
