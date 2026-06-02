# EduSync — Product Requirements Steering

## What is EduSync
EduSync is a multi-role school management SaaS platform that digitalises every core school operation for Indian schools. It connects school administrators, teachers, students, and parents on a single platform — each accessing a role-specific dashboard with real-time data and instant notifications.

## Problem Being Solved
Indian schools rely on manual, paper-based systems for core operations. EduSync solves:
- Attendance: teachers call names manually, parents have no real-time visibility
- Assignments: dictated verbally or on board, no submission tracking, no file sharing
- Announcements: written in student diaries, frequently lost before reaching parents
- Fees: parents visit school physically, no digital ledger, no automated reminders
- Performance: students see report cards once per term, no ongoing trend visibility

## User Roles

| Role              | Access Level   | Key Capabilities                                          |
|-------------------|----------------|-----------------------------------------------------------|
| Super Admin       | Platform-wide  | Approve schools, manage billing, view analytics           |
| School Admin      | School-wide    | Onboard teachers/students, edit calendar, view all reports|
| Teacher           | Class-level    | Attendance, assignments, announcements, grade entry       |
| Student / Parent  | Individual     | View records, submit assignments, pay fees, receive alerts|

## School Onboarding Flow
1. Principal registers school (name, board, address, total students, contact info)
2. EduSync verifies → generates unique School Code (e.g. DPS-RKP-001) + admin credentials
3. Principal logs in → creates class sections (e.g. Class 6A, 6B, 7A) → assigns teachers
4. Teachers added → auto-generated Teacher ID + credentials sent via email/SMS
5. Students enrolled (CSV upload or manual) → auto-generated Student ID + credentials to parents

RULE: Never manually create individual accounts. Everything flows top-down from school admin.

## Authentication
- One login screen for all users. System detects role from ID → routes to correct dashboard.
- Student and parent SHARE one account using the Student ID and password.
- Student actions: submit assignments, view attendance, view timetable, check performance
- Parent actions: pay fees, view payment history, receive absence notifications, monitor performance

## Core Feature Specifications

### 5.1 Digital Attendance
| Feature             | Who         | Description                                                        |
|---------------------|-------------|--------------------------------------------------------------------|
| Mark Attendance     | Teacher     | Select class + date → tap Present/Absent per student → submit      |
| Absence Notification| System auto | Instant push + SMS to parent when student marked absent            |
| Attendance Record   | Student/Parent | Full month-by-month history with percentage                     |
| Class Report        | Teacher/Admin  | Summary + flag students below threshold (e.g. below 75%)        |

### 5.2 Assignment Management
| Feature             | Who         | Description                                                        |
|---------------------|-------------|--------------------------------------------------------------------|
| Upload Assignment   | Teacher     | Post title, description, deadline, optional file attachments       |
| Class Notification  | System auto | All students notified immediately when assignment posted           |
| Submit Assignment   | Student     | Upload file or text before deadline                                |
| Review Submissions  | Teacher     | See submission status per student, mark reviewed, add grade/feedback|
| Assignment Archive  | Student/Parent | Full history with status (submitted / pending)                  |

### 5.3 Academic Calendar
- Shared school-specific calendar visible to all roles
- ONLY principal/admin has edit access
- Changes reflect instantly across the entire school
- Calendar is school-scoped — each school's calendar is completely separate

Event Types:
- Holiday: Republic Day, Holi, Summer Break, Diwali
- Exam: Unit Test (with subject tag), Half-Yearly, Board Practical
- School Event: Annual Day, Sports Day, Science Fair
- PTM: Parent-Teacher Meeting with date and time
- Vacation: Winter Break, Summer Holidays, Mid-term Break

### 5.4 Performance Graph
IMPORTANT: Do not only show raw marks. Show the TREND DIRECTION.
A student who went 55 → 70 → 78 is performing better than one stuck at 80. Trend is what parents care about most.

| Feature                | Who          | Description                                                   |
|------------------------|--------------|---------------------------------------------------------------|
| Overall Trend          | Student/Parent | Line graph: score % across Term 1, Term 2, Term 3, Final   |
| Subject Breakdown      | Student/Parent | Bar chart: scores by subject, highlights weak areas         |
| Test History           | Student/Parent | Every individual test and exam plotted chronologically      |
| Attendance Correlation | Student/Parent | Relationship between attendance % and academic score        |
| Class View             | Teacher      | Aggregate performance of entire class, click into any student |
| School Overview        | Admin        | Class-wise and school-wide performance summary                |

### 5.5 Announcements
| Feature              | Who          | Description                                                    |
|----------------------|--------------|----------------------------------------------------------------|
| Post Announcement    | Teacher/Admin| Text or file-attached, scoped to class or whole school         |
| Instant Notification | System auto  | Push notification to all affected students and parents         |
| Announcement Feed    | All roles    | Chronological list, filterable by class or category            |
| Pin Important Notices| Admin        | Pin critical notices (e.g. exam schedule) to top of feed       |

### 5.6 Fee Management
| Feature         | Who          | Description                                                         |
|-----------------|--------------|---------------------------------------------------------------------|
| Set Fee Structure| Admin       | Define fee components, amounts, due dates per class or school-wide  |
| Online Payment  | Parent       | Pay in-app via UPI, Razorpay, or net banking                        |
| Auto Reminders  | System auto  | Reminders sent automatically before due dates                       |
| Payment Receipt | Parent       | Instant digital receipt after successful payment                    |
| Fee Ledger      | Admin/Teacher| Full payment history per student, flag defaulters as overdue        |

## Dashboard Overview by Role

### Super Admin Dashboard
- View and approve/reject incoming school registration requests
- See all registered schools with key metrics
- Manage subscription plans and billing
- Platform-wide analytics and usage reports

### School Admin Dashboard (Principal / Director)
- Add, edit, or remove teachers and students
- Create class sections and assign teachers to classes
- Edit the school's Academic Calendar
- Post school-wide announcements
- View school-wide attendance, performance, and fee reports
- Manage academic calendar and fee structure

### Teacher Dashboard
- Mark daily attendance for assigned classes
- Upload assignments with deadlines and file attachments
- Review student submissions and add grades or feedback
- Post class-level or school-level announcements
- Enter test and exam scores (feeds student performance graph)
- View class performance overview
- Academic Calendar — view only

### Student / Parent Dashboard (Shared Account)
- View full attendance record and receive absence alerts
- Access, view, and submit assignments
- Check performance graph — subject-wise and trend-based
- View the Academic Calendar (read-only)
- Receive and browse announcements
- Pay fees online and view payment history (parent action)
- Access the school timetable

## Notification System
All notifications are real-time. Push for app users, SMS fallback for parents without the app.

| Trigger                     | Sent To         | Channel        |
|-----------------------------|-----------------|----------------|
| Student marked absent        | Parent          | Push + SMS     |
| New assignment posted        | Student/Parent  | Push           |
| Assignment deadline in 24hrs | Student/Parent  | Push           |
| New announcement             | All affected    | Push           |
| Fee due in 3 days            | Parent          | Push + SMS     |
| Fee overdue                  | Parent          | Push + SMS     |
| Calendar event added         | All school users| Push           |
| New report card / grade      | Student/Parent  | Push           |

## MVP Roadmap

### Phase 1 — Core Loop (Ship First)
- School onboarding and admin dashboard
- Teacher and student account creation (ID generation)
- Digital attendance marking
- Automatic absence notification to parents
- Academic Calendar with principal-only edit access

### Phase 2 — Engagement
- Assignment upload and student submission flow
- Announcements (class-level and school-wide)
- Student/Parent performance graph (subject-wise + trend)
- School timetable view

### Phase 3 — Revenue
- Online fee payment (UPI / Razorpay integration)
- Automated fee reminders and overdue flags
- Digital report cards and grade entry
- School-wide analytics and admin reports

## Technology Stack
- Frontend: React Native (iOS + Android) · Next.js (web admin portal) · Tailwind CSS
- Backend: Node.js + Express (REST API) · MongoDB Atlas · JWT authentication
- Notifications: Firebase Cloud Messaging (push) · Twilio or MSG91 (SMS) · WhatsApp Business API (optional, Phase 2)
- Payments: Razorpay (UPI, cards, net banking)
- Storage: AWS S3 (assignments, report cards)
- Deployment: Vercel (frontend) · Render or Railway (backend)

## Data Isolation Rule
Every piece of data is school-scoped. Data from one school is NEVER visible to another school.
Every DB query must include schoolCode filter. This is enforced at the middleware layer (schoolScope middleware), not in individual controllers.
