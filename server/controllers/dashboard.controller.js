const Teacher = require('../models/Teacher.model');
const Student = require('../models/Student.model');
const Attendance = require('../models/Attendance.model');
const CalendarEvent = require('../models/CalendarEvent.model');
const User = require('../models/User.model');
const Notification = require('../models/Notification.model');
const {
  successResponse,
  errorResponse,
  ERROR_CODES,
} = require('../utils/responseHandler');

/**
 * GET /api/dashboard/admin
 * Return admin dashboard data: total teachers, total students, today's attendance %,
 * upcoming calendar events, and recent accounts (school-scoped).
 * Requirements: 7.1, 7.2, 7.3
 */
async function adminDashboard(req, res, next) {
  try {
    const filter = { ...req.schoolFilter };

    // Total teachers and students
    const [totalTeachers, totalStudents] = await Promise.all([
      Teacher.countDocuments({ ...filter, isActive: true }),
      Student.countDocuments({ ...filter, isActive: true }),
    ]);

    // Today's attendance percentage
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const todayAttendance = await Attendance.find({
      ...filter,
      date: today,
    });

    let totalRecords = 0;
    let presentAndLate = 0;
    for (const record of todayAttendance) {
      for (const entry of record.records) {
        totalRecords++;
        if (entry.status === 'present' || entry.status === 'late') {
          presentAndLate++;
        }
      }
    }

    const todayAttendancePercentage =
      totalRecords > 0
        ? Math.round((presentAndLate / totalRecords) * 10000) / 100
        : 0;

    // Upcoming calendar events (startDate >= today)
    const upcomingEvents = await CalendarEvent.find({
      ...filter,
      startDate: { $gte: today },
    })
      .sort({ startDate: 1 })
      .limit(10);

    // Recent accounts (teachers and students created recently)
    const [recentTeachers, recentStudents] = await Promise.all([
      Teacher.find(filter).sort({ createdAt: -1 }).limit(5),
      Student.find(filter).sort({ createdAt: -1 }).limit(5),
    ]);

    // Merge and sort by createdAt desc
    const recentAccounts = [...recentTeachers, ...recentStudents]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);

    return successResponse(res, {
      totalTeachers,
      totalStudents,
      todayAttendancePercentage,
      upcomingEvents,
      recentAccounts,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/dashboard/teacher
 * Return teacher dashboard data: assigned classes with today's attendance status
 * (marked/not marked), upcoming events.
 * Requirements: 8.1, 8.2
 */
async function teacherDashboard(req, res, next) {
  try {
    const filter = { ...req.schoolFilter };

    // Find the teacher record for the current user
    const teacher = await Teacher.findOne({
      ...filter,
      userId: req.user._id,
    });

    if (!teacher) {
      return errorResponse(
        res,
        ERROR_CODES.NOT_FOUND,
        'Teacher record not found',
        null,
        404
      );
    }

    // Today's date
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Check attendance status for each assigned class
    const classesWithStatus = await Promise.all(
      teacher.assignedClasses.map(async (ac) => {
        const attendance = await Attendance.findOne({
          ...filter,
          class: ac.class,
          section: ac.section,
          date: today,
        });

        return {
          class: ac.class,
          section: ac.section,
          attendanceMarked: !!attendance,
        };
      })
    );

    // Upcoming calendar events
    const upcomingEvents = await CalendarEvent.find({
      ...filter,
      startDate: { $gte: today },
    })
      .sort({ startDate: 1 })
      .limit(10);

    return successResponse(res, {
      assignedClasses: classesWithStatus,
      upcomingEvents,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/dashboard/student
 * Return student dashboard data: current month attendance summary (present, absent,
 * late, percentage), upcoming events, recent notifications.
 * Requirements: 9.1, 9.2
 */
async function studentDashboard(req, res, next) {
  try {
    const filter = { ...req.schoolFilter };

    // Find the student record for the current user
    const student = await Student.findOne({
      ...filter,
      userId: req.user._id,
    });

    if (!student) {
      return errorResponse(
        res,
        ERROR_CODES.NOT_FOUND,
        'Student record not found',
        null,
        404
      );
    }

    // Current month date range
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    // Find attendance records for this student in the current month
    const attendanceRecords = await Attendance.find({
      ...filter,
      'records.studentId': student.studentId,
      date: { $gte: monthStart, $lte: monthEnd },
    });

    let present = 0;
    let absent = 0;
    let late = 0;

    for (const record of attendanceRecords) {
      const studentRecord = record.records.find(
        (r) => r.studentId === student.studentId
      );
      if (!studentRecord) continue;

      if (studentRecord.status === 'present') present++;
      else if (studentRecord.status === 'absent') absent++;
      else if (studentRecord.status === 'late') late++;
    }

    const total = present + absent + late;
    const percentage =
      total > 0
        ? Math.round(((present + late) / total) * 10000) / 100
        : 0;

    // Upcoming calendar events
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const upcomingEvents = await CalendarEvent.find({
      ...filter,
      startDate: { $gte: today },
    })
      .sort({ startDate: 1 })
      .limit(10);

    // Recent notifications
    const recentNotifications = await Notification.find({
      ...filter,
      userId: req.user.userId,
    })
      .sort({ createdAt: -1 })
      .limit(10);

    return successResponse(res, {
      attendance: {
        present,
        absent,
        late,
        total,
        percentage,
      },
      upcomingEvents,
      recentNotifications,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  adminDashboard,
  teacherDashboard,
  studentDashboard,
};
