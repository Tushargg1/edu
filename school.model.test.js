# EduSync — Technical Architecture Steering

## Stack
- Frontend: React (Vite) + Tailwind CSS + Redux Toolkit + RTK Query
- Backend: Node.js + Express (REST API)
- Database: MongoDB Atlas (Mongoose)
- Auth: JWT (access token 15min in-memory, refresh token 7days httpOnly cookie)
- File Storage: AWS S3
- Notifications: Firebase Cloud Messaging (push) + Twilio/MSG91 (SMS fallback)
- Payments: Razorpay (UPI, cards, net banking)
- Deployment: Vercel (frontend) + Render or Railway (backend)

## Project Directory Structure

```
edusync/
├── client/                          # React (Vite) Frontend
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/              # Button, Badge, Input, Alert
│   │   │   ├── layout/              # Sidebar, Topbar, PageShell
│   │   │   ├── attendance/          # AttendanceGrid, AttendanceBadge
│   │   │   ├── assignments/         # AssignmentCard, SubmissionList
│   │   │   ├── calendar/            # CalendarView, EventBadge
│   │   │   ├── fees/                # FeeCard, PaymentHistory
│   │   │   └── performance/         # PerformanceChart, SubjectBar
│   │   ├── pages/
│   │   │   ├── auth/                # Login.jsx
│   │   │   ├── super-admin/         # SuperAdminDashboard.jsx
│   │   │   ├── admin/               # AdminDashboard, Calendar, Reports
│   │   │   ├── teacher/             # TeacherDashboard, Attendance, Assignments
│   │   │   └── student/             # StudentDashboard, Performance, Fees
│   │   ├── store/
│   │   │   ├── store.js
│   │   │   ├── slices/
│   │   │   │   ├── authSlice.js
│   │   │   │   ├── attendanceSlice.js
│   │   │   │   ├── assignmentSlice.js
│   │   │   │   ├── calendarSlice.js
│   │   │   │   ├── feesSlice.js
│   │   │   │   └── performanceSlice.js
│   │   │   └── api/
│   │   │       └── edusyncApi.js    # RTK Query API definitions
│   │   ├── hooks/                   # useAuth, useRole, useSocket
│   │   ├── utils/                   # formatDate, roleGuard, tokenHelper
│   │   ├── routes/                  # ProtectedRoute, RoleRoute, AppRouter
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                          # Node.js + Express Backend
│   ├── config/
│   │   ├── db.js                    # MongoDB Atlas connection
│   │   └── cloudStorage.js          # AWS S3 config
│   ├── models/
│   │   ├── User.model.js
│   │   ├── School.model.js
│   │   ├── Student.model.js
│   │   ├── Teacher.model.js
│   │   ├── Attendance.model.js
│   │   ├── Assignment.model.js
│   │   ├── Submission.model.js
│   │   ├── CalendarEvent.model.js
│   │   ├── Announcement.model.js
│   │   ├── Fee.model.js
│   │   └── Performance.model.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── school.routes.js
│   │   ├── student.routes.js
│   │   ├── teacher.routes.js
│   │   ├── attendance.routes.js
│   │   ├── assignment.routes.js
│   │   ├── calendar.routes.js
│   │   ├── announcement.routes.js
│   │   ├── fees.routes.js
│   │   └── performance.routes.js
│   ├── controllers/                 # Business logic (mirrors routes)
│   ├── middleware/
│   │   ├── auth.middleware.js        # verifyToken, requireRole
│   │   ├── school.middleware.js      # schoolScope (data isolation)
│   │   └── upload.middleware.js      # multer + S3
│   ├── services/
│   │   ├── notification.service.js  # FCM push + SMS fallback
│   │   ├── payment.service.js       # Razorpay integration
│   │   └── id.service.js            # ID generation
│   ├── utils/
│   │   ├── jwtHelper.js
│   │   ├── idGenerator.js
│   │   └── responseHandler.js
│   ├── app.js
│   └── server.js
│
├── .env
├── .gitignore
└── package.json
```

## Database Models

### User Model
- Fields: userId (unique), schoolCode (index), role (enum), password (bcrypt), name, email, phone, isActive, fcmToken
- Roles: super_admin | school_admin | teacher | student
- Pre-save hook: bcrypt hash (salt 12)
- Method: matchPassword(plain)

### Student Model
- Fields: studentId (unique), schoolCode (index), userId (ref: User), name, class, section, rollNumber, dob, gender, parentName, parentPhone, parentEmail, admissionYear, isActive

### Teacher Model
- Fields: teacherId (unique), schoolCode (index), userId (ref: User), name, email, phone, subjects[], assignedClasses[], isClassTeacher, classTeacherOf, isActive

### Assignment Model
- Fields: schoolCode, teacherId (ref: Teacher), title, description, subject, class, section, deadline, attachments[{filename, url, mimetype}], maxMarks, isActive
- Virtual: submissionCount

### Attendance Model
- Fields: schoolCode, class, section, date, markedBy (ref: Teacher), records[{studentId, status (present|absent|late), notified}]
- Compound unique index: schoolCode + class + section + date

## ID Structure
- School:   DPS-RKP-001
- Teacher:  DPS-RKP-T-012
- Student:  DPS-RKP-S-2024-047

## API Routes (MVP)

### Auth
- POST   /api/auth/login          — Public — login, get JWT
- POST   /api/auth/logout         — All roles
- POST   /api/auth/refresh        — All roles — refresh access token
- GET    /api/auth/me             — All roles — current user

### Schools
- POST   /api/schools/register         — Public
- GET    /api/schools                  — Super Admin
- PATCH  /api/schools/:id/approve      — Super Admin
- GET    /api/schools/:code            — Admin
- PUT    /api/schools/:code            — Admin

### Students
- GET    /api/students                 — Admin/Teacher
- POST   /api/students                 — Admin
- POST   /api/students/bulk            — Admin (CSV)
- GET    /api/students/:id             — Admin/Teacher
- PUT    /api/students/:id             — Admin
- DELETE /api/students/:id             — Admin

### Teachers
- GET    /api/teachers                 — Admin
- POST   /api/teachers                 — Admin
- GET    /api/teachers/:id             — Admin
- PUT    /api/teachers/:id             — Admin
- DELETE /api/teachers/:id             — Admin

### Attendance
- POST   /api/attendance                      — Teacher
- GET    /api/attendance                      — Teacher/Admin
- GET    /api/attendance/student/:id          — Student/Parent
- PATCH  /api/attendance/:id                  — Teacher
- GET    /api/attendance/report/:class        — Admin/Teacher

### Assignments
- POST   /api/assignments                     — Teacher
- GET    /api/assignments                     — All roles
- GET    /api/assignments/:id                 — All roles
- PUT    /api/assignments/:id                 — Teacher
- DELETE /api/assignments/:id                 — Teacher/Admin
- POST   /api/assignments/:id/submit          — Student
- GET    /api/assignments/:id/submissions     — Teacher
- PATCH  /api/assignments/:id/submissions/:sid — Teacher

### Calendar
- GET    /api/calendar                — All roles
- POST   /api/calendar                — Admin
- PUT    /api/calendar/:id            — Admin
- DELETE /api/calendar/:id            — Admin

### Fees
- GET    /api/fees/structure          — Admin/Parent
- POST   /api/fees/structure          — Admin
- GET    /api/fees                    — Admin/Teacher
- GET    /api/fees/student/:id        — Student/Parent
- POST   /api/fees/initiate           — Parent
- POST   /api/fees/verify             — Parent

### Performance
- POST   /api/performance             — Teacher
- GET    /api/performance/student/:id — Student/Parent
- GET    /api/performance/class/:cls  — Teacher/Admin

### Notifications
- POST   /api/notifications/send      — System/Admin
- GET    /api/notifications           — All roles
- PATCH  /api/notifications/:id/read  — All roles

## State Management: Redux Toolkit (RTK Query)

Use Redux Toolkit with RTK Query for all API calls and caching. Do NOT use Context API for global state.

- authSlice: stores { user, token, role } in memory (never localStorage)
- attendanceSlice, assignmentSlice, calendarSlice, feesSlice, performanceSlice
- edusyncApi.js: RTK Query with tag-based cache invalidation
- Tags: Attendance | Assignment | Student | Fees | Calendar

## Authentication Flow

1. POST /api/auth/login with userId + password
2. Server validates → builds JWT payload: { userId, role, schoolCode, name }
3. Access token: 15 min (HS256), stored in Redux memory only
4. Refresh token: 7 days, stored in httpOnly cookie
5. All requests: Authorization: Bearer <token> via RTK Query prepareHeaders
6. Middleware chain on every protected route:
   - verifyToken → decode JWT, attach req.user
   - requireRole(...roles) → check req.user.role
   - schoolScope → inject { schoolCode: req.user.schoolCode } into every DB query

## Role Permission Matrix

| Feature                  | Super Admin | School Admin | Teacher | Student/Parent |
|--------------------------|-------------|--------------|---------|----------------|
| Approve school           | ✅          | ❌           | ❌      | ❌             |
| Create teacher accounts  | ❌          | ✅           | ❌      | ❌             |
| Enroll students          | ❌          | ✅           | ❌      | ❌             |
| Edit academic calendar   | ❌          | ✅           | ❌      | ❌             |
| Mark attendance          | ❌          | ❌           | ✅      | ❌             |
| Upload assignments       | ❌          | ❌           | ✅      | ❌             |
| Grade submissions        | ❌          | ❌           | ✅      | ❌             |
| Enter exam scores        | ❌          | ❌           | ✅      | ❌             |
| View own attendance      | ❌          | ❌           | ❌      | ✅             |
| Submit assignments       | ❌          | ❌           | ❌      | ✅             |
| Pay fees online          | ❌          | ❌           | ❌      | ✅             |
| View performance graph   | ❌          | ✅           | ✅      | ✅             |
| Post announcements       | ❌          | ✅           | ✅      | ❌             |

## Build Phases (MVP Roadmap)

### Phase 1 — Core Loop
- School onboarding and admin dashboard
- Teacher and student account creation (ID generation)
- Digital attendance marking
- Automatic absence notification to parents
- Academic Calendar (principal-only edit)

### Phase 2 — Engagement
- Assignment upload and student submission flow
- Announcements (class-level and school-wide)
- Student/Parent performance graph (subject-wise + trend)
- School timetable view

### Phase 3 — Revenue
- Online fee payment (UPI / Razorpay)
- Automated fee reminders and overdue flags
- Digital report cards and grade entry
- School-wide analytics and admin reports
