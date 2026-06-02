import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import request from 'supertest';

const TEST_JWT_SECRET = 'test-jwt-secret-key';
const TEST_JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';

let mongoServer;
let CalendarEvent;
let User;
let calendarController;

beforeAll(async () => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = TEST_JWT_REFRESH_SECRET;
  process.env.NODE_ENV = 'test';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  calendarController = await import('../../controllers/calendar.controller.js');
  CalendarEvent = mongoose.model('CalendarEvent');
  User = mongoose.model('User');
});

afterEach(async () => {
  await CalendarEvent.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.JWT_SECRET;
  delete process.env.JWT_REFRESH_SECRET;
  delete process.env.NODE_ENV;
});

/** Middleware to simulate verifyToken by reading x-test-user header */
function injectTestUser(req, res, next) {
  if (req.headers['x-test-user']) {
    req.user = JSON.parse(req.headers['x-test-user']);
  }
  next();
}

/** Middleware to simulate schoolScope */
function injectSchoolFilter(req, res, next) {
  if (req.user && req.user.role === 'super_admin') {
    req.schoolFilter = {};
  } else if (req.user) {
    req.schoolFilter = { schoolCode: req.user.schoolCode };
  } else {
    req.schoolFilter = {};
  }
  next();
}

function buildApp() {
  const app = express();
  app.use(express.json());

  // GET /api/calendar
  app.get(
    '/api/calendar',
    injectTestUser,
    injectSchoolFilter,
    calendarController.listEvents
  );

  // POST /api/calendar
  app.post(
    '/api/calendar',
    injectTestUser,
    injectSchoolFilter,
    calendarController.createEventValidation,
    calendarController.createEvent
  );

  // PUT /api/calendar/:id
  app.put(
    '/api/calendar/:id',
    injectTestUser,
    injectSchoolFilter,
    calendarController.updateEventValidation,
    calendarController.updateEvent
  );

  // DELETE /api/calendar/:id
  app.delete(
    '/api/calendar/:id',
    injectTestUser,
    injectSchoolFilter,
    calendarController.deleteEvent
  );

  return app;
}

const SCHOOL_CODE = 'DPS-DEL-001';

function adminUser(overrides = {}) {
  return {
    userId: 'DPS-DEL-ADM-001',
    _id: overrides._id || new mongoose.Types.ObjectId().toString(),
    role: 'school_admin',
    schoolCode: SCHOOL_CODE,
    name: 'Admin User',
    ...overrides,
  };
}

function teacherUser(overrides = {}) {
  return {
    userId: 'DPS-DEL-T-001',
    _id: overrides._id || new mongoose.Types.ObjectId().toString(),
    role: 'teacher',
    schoolCode: SCHOOL_CODE,
    name: 'Teacher User',
    ...overrides,
  };
}

function validEventData(overrides = {}) {
  return {
    title: 'Annual Day',
    eventType: 'School_Event',
    startDate: '2025-03-15',
    endDate: '2025-03-15',
    description: 'Annual day celebration',
    ...overrides,
  };
}

describe('Calendar Controller', () => {
  describe('POST /api/calendar (createEvent)', () => {
    it('should create a calendar event with valid data', async () => {
      const app = buildApp();
      const user = adminUser();

      const res = await request(app)
        .post('/api/calendar')
        .set('x-test-user', JSON.stringify(user))
        .send(validEventData());

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.event.title).toBe('Annual Day');
      expect(res.body.data.event.eventType).toBe('School_Event');
      expect(res.body.data.event.schoolCode).toBe(SCHOOL_CODE);
    });

    it('should save event with schoolCode from the authenticated user', async () => {
      const app = buildApp();
      const user = adminUser();

      const res = await request(app)
        .post('/api/calendar')
        .set('x-test-user', JSON.stringify(user))
        .send(validEventData());

      expect(res.status).toBe(201);
      expect(res.body.data.event.schoolCode).toBe(SCHOOL_CODE);

      // Verify in DB
      const dbEvent = await CalendarEvent.findById(res.body.data.event._id);
      expect(dbEvent.schoolCode).toBe(SCHOOL_CODE);
    });

    it('should return 400 when title is missing', async () => {
      const app = buildApp();
      const user = adminUser();

      const res = await request(app)
        .post('/api/calendar')
        .set('x-test-user', JSON.stringify(user))
        .send(validEventData({ title: '' }));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields.some((f) => f.field === 'title')).toBe(true);
    });

    it('should return 400 when eventType is invalid', async () => {
      const app = buildApp();
      const user = adminUser();

      const res = await request(app)
        .post('/api/calendar')
        .set('x-test-user', JSON.stringify(user))
        .send(validEventData({ eventType: 'InvalidType' }));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields.some((f) => f.field === 'eventType')).toBe(true);
    });

    it('should return 400 when startDate is missing', async () => {
      const app = buildApp();
      const user = adminUser();

      const res = await request(app)
        .post('/api/calendar')
        .set('x-test-user', JSON.stringify(user))
        .send(validEventData({ startDate: '' }));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when endDate is missing', async () => {
      const app = buildApp();
      const user = adminUser();

      const res = await request(app)
        .post('/api/calendar')
        .set('x-test-user', JSON.stringify(user))
        .send(validEventData({ endDate: '' }));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when startDate is after endDate', async () => {
      const app = buildApp();
      const user = adminUser();

      const res = await request(app)
        .post('/api/calendar')
        .set('x-test-user', JSON.stringify(user))
        .send(validEventData({ startDate: '2025-03-20', endDate: '2025-03-15' }));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields.some((f) => f.field === 'startDate')).toBe(true);
    });

    it('should allow same-day start and end dates', async () => {
      const app = buildApp();
      const user = adminUser();

      const res = await request(app)
        .post('/api/calendar')
        .set('x-test-user', JSON.stringify(user))
        .send(validEventData({ startDate: '2025-03-15', endDate: '2025-03-15' }));

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should create event with all valid event types', async () => {
      const app = buildApp();
      const user = adminUser();
      const types = ['Holiday', 'Exam', 'School_Event', 'PTM', 'Vacation'];

      for (const eventType of types) {
        const res = await request(app)
          .post('/api/calendar')
          .set('x-test-user', JSON.stringify(user))
          .send(validEventData({ eventType }));

        expect(res.status).toBe(201);
        expect(res.body.data.event.eventType).toBe(eventType);
      }
    });

    it('should allow creating event without description', async () => {
      const app = buildApp();
      const user = adminUser();
      const data = validEventData();
      delete data.description;

      const res = await request(app)
        .post('/api/calendar')
        .set('x-test-user', JSON.stringify(user))
        .send(data);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/calendar (listEvents)', () => {
    it('should return events filtered by schoolCode', async () => {
      const app = buildApp();
      const user = adminUser();

      // Create events for our school
      await CalendarEvent.create({
        schoolCode: SCHOOL_CODE,
        title: 'Event 1',
        eventType: 'Holiday',
        startDate: new Date('2025-03-15'),
        endDate: new Date('2025-03-15'),
        createdBy: new mongoose.Types.ObjectId(),
      });

      // Create event for another school
      await CalendarEvent.create({
        schoolCode: 'OTH-MUM-001',
        title: 'Other School Event',
        eventType: 'Holiday',
        startDate: new Date('2025-03-15'),
        endDate: new Date('2025-03-15'),
        createdBy: new mongoose.Types.ObjectId(),
      });

      const res = await request(app)
        .get('/api/calendar')
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      expect(res.body.data.events).toHaveLength(1);
      expect(res.body.data.events[0].title).toBe('Event 1');
    });

    it('should filter events by eventType query param', async () => {
      const app = buildApp();
      const user = adminUser();

      await CalendarEvent.create([
        {
          schoolCode: SCHOOL_CODE,
          title: 'Holiday Event',
          eventType: 'Holiday',
          startDate: new Date('2025-03-15'),
          endDate: new Date('2025-03-15'),
          createdBy: new mongoose.Types.ObjectId(),
        },
        {
          schoolCode: SCHOOL_CODE,
          title: 'Exam Event',
          eventType: 'Exam',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-04-05'),
          createdBy: new mongoose.Types.ObjectId(),
        },
      ]);

      const res = await request(app)
        .get('/api/calendar?eventType=Holiday')
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      expect(res.body.data.events).toHaveLength(1);
      expect(res.body.data.events[0].eventType).toBe('Holiday');
    });

    it('should filter events by date range query params', async () => {
      const app = buildApp();
      const user = adminUser();

      await CalendarEvent.create([
        {
          schoolCode: SCHOOL_CODE,
          title: 'March Event',
          eventType: 'Holiday',
          startDate: new Date('2025-03-15'),
          endDate: new Date('2025-03-15'),
          createdBy: new mongoose.Types.ObjectId(),
        },
        {
          schoolCode: SCHOOL_CODE,
          title: 'May Event',
          eventType: 'Vacation',
          startDate: new Date('2025-05-01'),
          endDate: new Date('2025-05-31'),
          createdBy: new mongoose.Types.ObjectId(),
        },
      ]);

      const res = await request(app)
        .get('/api/calendar?startDate=2025-03-01&endDate=2025-03-31')
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      expect(res.body.data.events).toHaveLength(1);
      expect(res.body.data.events[0].title).toBe('March Event');
    });

    it('should return events sorted by startDate ascending', async () => {
      const app = buildApp();
      const user = adminUser();

      await CalendarEvent.create([
        {
          schoolCode: SCHOOL_CODE,
          title: 'Later Event',
          eventType: 'Exam',
          startDate: new Date('2025-06-01'),
          endDate: new Date('2025-06-05'),
          createdBy: new mongoose.Types.ObjectId(),
        },
        {
          schoolCode: SCHOOL_CODE,
          title: 'Earlier Event',
          eventType: 'Holiday',
          startDate: new Date('2025-01-15'),
          endDate: new Date('2025-01-15'),
          createdBy: new mongoose.Types.ObjectId(),
        },
      ]);

      const res = await request(app)
        .get('/api/calendar')
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      expect(res.body.data.events).toHaveLength(2);
      expect(res.body.data.events[0].title).toBe('Earlier Event');
      expect(res.body.data.events[1].title).toBe('Later Event');
    });

    it('should return empty array when no events exist', async () => {
      const app = buildApp();
      const user = adminUser();

      const res = await request(app)
        .get('/api/calendar')
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      expect(res.body.data.events).toHaveLength(0);
    });

    it('should allow teacher role to list events', async () => {
      const app = buildApp();
      const user = teacherUser();

      await CalendarEvent.create({
        schoolCode: SCHOOL_CODE,
        title: 'Teacher Visible Event',
        eventType: 'PTM',
        startDate: new Date('2025-03-15'),
        endDate: new Date('2025-03-15'),
        createdBy: new mongoose.Types.ObjectId(),
      });

      const res = await request(app)
        .get('/api/calendar')
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      expect(res.body.data.events).toHaveLength(1);
    });
  });

  describe('PUT /api/calendar/:id (updateEvent)', () => {
    it('should update an existing calendar event', async () => {
      const app = buildApp();
      const user = adminUser();

      const event = await CalendarEvent.create({
        schoolCode: SCHOOL_CODE,
        title: 'Original Title',
        eventType: 'Holiday',
        startDate: new Date('2025-03-15'),
        endDate: new Date('2025-03-15'),
        createdBy: new mongoose.Types.ObjectId(),
      });

      const res = await request(app)
        .put(`/api/calendar/${event._id}`)
        .set('x-test-user', JSON.stringify(user))
        .send({ title: 'Updated Title', eventType: 'Exam' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.event.title).toBe('Updated Title');
      expect(res.body.data.event.eventType).toBe('Exam');
    });

    it('should return 404 for non-existent event', async () => {
      const app = buildApp();
      const user = adminUser();
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .put(`/api/calendar/${fakeId}`)
        .set('x-test-user', JSON.stringify(user))
        .send({ title: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 when event belongs to different school', async () => {
      const app = buildApp();
      const user = adminUser();

      const event = await CalendarEvent.create({
        schoolCode: 'OTH-MUM-001',
        title: 'Other School Event',
        eventType: 'Holiday',
        startDate: new Date('2025-03-15'),
        endDate: new Date('2025-03-15'),
        createdBy: new mongoose.Types.ObjectId(),
      });

      const res = await request(app)
        .put(`/api/calendar/${event._id}`)
        .set('x-test-user', JSON.stringify(user))
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(404);
    });

    it('should return 400 when update makes startDate after endDate', async () => {
      const app = buildApp();
      const user = adminUser();

      const event = await CalendarEvent.create({
        schoolCode: SCHOOL_CODE,
        title: 'Event',
        eventType: 'Holiday',
        startDate: new Date('2025-03-15'),
        endDate: new Date('2025-03-20'),
        createdBy: new mongoose.Types.ObjectId(),
      });

      const res = await request(app)
        .put(`/api/calendar/${event._id}`)
        .set('x-test-user', JSON.stringify(user))
        .send({ startDate: '2025-03-25' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when eventType is invalid on update', async () => {
      const app = buildApp();
      const user = adminUser();

      const event = await CalendarEvent.create({
        schoolCode: SCHOOL_CODE,
        title: 'Event',
        eventType: 'Holiday',
        startDate: new Date('2025-03-15'),
        endDate: new Date('2025-03-15'),
        createdBy: new mongoose.Types.ObjectId(),
      });

      const res = await request(app)
        .put(`/api/calendar/${event._id}`)
        .set('x-test-user', JSON.stringify(user))
        .send({ eventType: 'InvalidType' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should update description field', async () => {
      const app = buildApp();
      const user = adminUser();

      const event = await CalendarEvent.create({
        schoolCode: SCHOOL_CODE,
        title: 'Event',
        eventType: 'Holiday',
        startDate: new Date('2025-03-15'),
        endDate: new Date('2025-03-15'),
        createdBy: new mongoose.Types.ObjectId(),
      });

      const res = await request(app)
        .put(`/api/calendar/${event._id}`)
        .set('x-test-user', JSON.stringify(user))
        .send({ description: 'New description' });

      expect(res.status).toBe(200);
      expect(res.body.data.event.description).toBe('New description');
    });
  });

  describe('DELETE /api/calendar/:id (deleteEvent)', () => {
    it('should delete an existing calendar event', async () => {
      const app = buildApp();
      const user = adminUser();

      const event = await CalendarEvent.create({
        schoolCode: SCHOOL_CODE,
        title: 'To Delete',
        eventType: 'Holiday',
        startDate: new Date('2025-03-15'),
        endDate: new Date('2025-03-15'),
        createdBy: new mongoose.Types.ObjectId(),
      });

      const res = await request(app)
        .delete(`/api/calendar/${event._id}`)
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify deleted from DB
      const dbEvent = await CalendarEvent.findById(event._id);
      expect(dbEvent).toBeNull();
    });

    it('should return 404 for non-existent event', async () => {
      const app = buildApp();
      const user = adminUser();
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .delete(`/api/calendar/${fakeId}`)
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 when event belongs to different school', async () => {
      const app = buildApp();
      const user = adminUser();

      const event = await CalendarEvent.create({
        schoolCode: 'OTH-MUM-001',
        title: 'Other School Event',
        eventType: 'Holiday',
        startDate: new Date('2025-03-15'),
        endDate: new Date('2025-03-15'),
        createdBy: new mongoose.Types.ObjectId(),
      });

      const res = await request(app)
        .delete(`/api/calendar/${event._id}`)
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(404);
    });

    it('should not affect other events when deleting one', async () => {
      const app = buildApp();
      const user = adminUser();

      const event1 = await CalendarEvent.create({
        schoolCode: SCHOOL_CODE,
        title: 'Keep This',
        eventType: 'Holiday',
        startDate: new Date('2025-03-15'),
        endDate: new Date('2025-03-15'),
        createdBy: new mongoose.Types.ObjectId(),
      });

      const event2 = await CalendarEvent.create({
        schoolCode: SCHOOL_CODE,
        title: 'Delete This',
        eventType: 'Exam',
        startDate: new Date('2025-04-01'),
        endDate: new Date('2025-04-05'),
        createdBy: new mongoose.Types.ObjectId(),
      });

      await request(app)
        .delete(`/api/calendar/${event2._id}`)
        .set('x-test-user', JSON.stringify(user));

      const remaining = await CalendarEvent.find({ schoolCode: SCHOOL_CODE });
      expect(remaining).toHaveLength(1);
      expect(remaining[0].title).toBe('Keep This');
    });
  });
});
