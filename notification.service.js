const Notification = require('../models/Notification.model');
const {
  successResponse,
  errorResponse,
  ERROR_CODES,
} = require('../utils/responseHandler');

/**
 * GET /api/notifications
 * Return notifications for the current user, school-scoped, sorted by createdAt desc.
 * Requirements: 12.1, 15.1
 */
async function listNotifications(req, res, next) {
  try {
    const filter = {
      ...req.schoolFilter,
      userId: req.user.userId,
    };

    const notifications = await Notification.find(filter).sort({ createdAt: -1 });
    return successResponse(res, { notifications });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read (by MongoDB _id, school-scoped).
 * Requirements: 12.1, 15.1
 */
async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        ...req.schoolFilter,
        userId: req.user.userId,
      },
      { isRead: true },
      { returnDocument: 'after' }
    );

    if (!notification) {
      return errorResponse(
        res,
        ERROR_CODES.NOT_FOUND,
        'Notification not found',
        null,
        404
      );
    }

    return successResponse(res, { notification });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listNotifications,
  markAsRead,
};
