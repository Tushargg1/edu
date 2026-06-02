const User = require('../models/User.model');
const Notification = require('../models/Notification.model');

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

/** Format a Date as YYYY-MM-DD (UTC). */
function formatDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

/**
 * Factory that builds the notification service. Transport functions
 * (sendPush / sendSMS / sendEmail) and the `delay` helper are injected so
 * they can be mocked in tests.
 *
 * @param {object} deps
 * @param {Function} [deps.sendPush]  (token, title, message) => Promise
 * @param {Function} [deps.sendSMS]   (phone, message) => Promise
 * @param {Function} [deps.sendEmail] (email, subject, message) => Promise
 * @param {Function} [deps.delay]     (ms) => Promise
 */
function createNotificationService(deps = {}) {
  const {
    sendPush = () => Promise.resolve({ success: true }),
    sendSMS = () => Promise.resolve({ success: true }),
    sendEmail = () => Promise.resolve({ success: true }),
    delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  } = deps;

  /**
   * Run `fn` with exponential-backoff retries.
   * Total attempts = 1 initial + MAX_RETRIES. Delays: 500, 1000, 2000ms.
   */
  async function withRetry(fn) {
    let lastError;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES) {
          await delay(BASE_DELAY_MS * 2 ** attempt);
        }
      }
    }
    throw lastError;
  }

  /**
   * Notify a parent that their child was marked absent.
   * Prefers push (if the user has an FCM token), otherwise falls back to SMS.
   */
  async function sendAbsenceNotification(student, date) {
    const user = await User.findById(student.userId);
    if (!user) throw new Error('User not found');

    const dateStr = formatDate(date);
    const message = `${student.name} was marked absent in Class ${student.class} Section ${student.section} on ${dateStr}.`;

    const baseNotification = {
      schoolCode: student.schoolCode,
      userId: user.userId,
      title: 'Absence Alert',
      message,
      type: 'absence',
      metadata: {
        studentId: student.studentId,
        studentName: student.name,
        date: dateStr,
      },
    };

    if (user.fcmToken) {
      let success = true;
      try {
        await withRetry(() => sendPush(user.fcmToken, 'Absence Alert', message));
      } catch (err) {
        success = false;
      }
      await Notification.create({ ...baseNotification, channel: 'push' });
      return { channel: 'push', success };
    }

    // SMS fallback
    const phone = student.parentPhone || user.phone;
    if (!phone) {
      return { channel: 'sms', success: false };
    }

    let success = true;
    try {
      await withRetry(() => sendSMS(phone, message));
    } catch (err) {
      success = false;
    }
    await Notification.create({ ...baseNotification, channel: 'sms' });
    return { channel: 'sms', success };
  }

  /**
   * Broadcast a calendar event to every active user in the school.
   * Push is attempted for users with an FCM token; a Notification record is
   * created for all active users regardless.
   */
  async function sendCalendarEventNotification(event, schoolCode) {
    const users = await User.find({ schoolCode, isActive: true });
    const dateStr = formatDate(event.startDate);
    const message = `New ${event.eventType} event: "${event.title}" starting on ${dateStr}.`;

    for (const user of users) {
      if (user.fcmToken) {
        try {
          await withRetry(() => sendPush(user.fcmToken, event.title, message));
        } catch (err) {
          // Swallow individual push failures so one user can't block the rest.
        }
      }

      await Notification.create({
        schoolCode,
        userId: user.userId,
        title: event.title,
        message,
        type: 'calendar',
        channel: 'push',
        metadata: {
          eventTitle: event.title,
          eventType: event.eventType,
          startDate: dateStr,
        },
      });
    }
  }

  /**
   * Send freshly-generated login credentials to a user over the requested
   * channels (email and/or sms).
   */
  async function sendCredentialNotification(userId, credentials, channels) {
    const user = await User.findOne({ userId });
    if (!user) throw new Error('User not found');

    const message = `Welcome to EduSync! Your login ID is ${credentials.id} and your temporary password is ${credentials.password}. Please log in and change your password.`;

    for (const channel of channels) {
      if (channel === 'email') {
        try {
          await withRetry(() =>
            sendEmail(user.email, 'Your EduSync Credentials', message)
          );
        } catch (err) {
          // logged by caller
        }
        await Notification.create({
          schoolCode: user.schoolCode,
          userId: user.userId,
          title: 'Your EduSync Credentials',
          message,
          type: 'credential',
          channel: 'email',
        });
      } else if (channel === 'sms') {
        try {
          await withRetry(() => sendSMS(user.phone, message));
        } catch (err) {
          // logged by caller
        }
        await Notification.create({
          schoolCode: user.schoolCode,
          userId: user.userId,
          title: 'Your EduSync Credentials',
          message,
          type: 'credential',
          channel: 'sms',
        });
      }
    }
  }

  return {
    withRetry,
    sendAbsenceNotification,
    sendCalendarEventNotification,
    sendCredentialNotification,
  };
}

// Default singleton used by controllers. Transports are no-ops for now
// (real push/SMS/email integration can be wired in later).
const defaultService = createNotificationService();

module.exports = {
  createNotificationService,
  sendAbsenceNotification: defaultService.sendAbsenceNotification,
  sendCalendarEventNotification: defaultService.sendCalendarEventNotification,
  sendCredentialNotification: defaultService.sendCredentialNotification,
};
