import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

const TEST_JWT_SECRET = 'test-jwt-secret-key';
const TEST_JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';

let mongoServer;
let dashboardRoutes;

beforeAll(async () => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = TEST_JWT_REFRESH_SECRET;
  process.env.NODE_ENV = 'test';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Import via ESM to avoid model re-registration issues
  dashboardRoutes = (await import('../../routes/dashboard.routes.js')).default;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.JWT_SECRET;
  delete process.env.JWT_REFRESH_SECRET;
  delete process.env.NODE_ENV;
});

describe('Dashboard Routes', () => {
  it('should export a valid Express router', () => {
    expect(dashboardRoutes).toBeDefined();
    expect(dashboardRoutes.stack).toBeDefined();
  });

  it('should define GET /admin route', () => {
    const routes = dashboardRoutes.stack
      .filter((layer) => layer.route)
      .map((layer) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));

    expect(routes).toContainEqual({ path: '/admin', methods: ['get'] });
  });

  it('should define GET /teacher route', () => {
    const routes = dashboardRoutes.stack
      .filter((layer) => layer.route)
      .map((layer) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));

    expect(routes).toContainEqual({ path: '/teacher', methods: ['get'] });
  });

  it('should define GET /student route', () => {
    const routes = dashboardRoutes.stack
      .filter((layer) => layer.route)
      .map((layer) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));

    expect(routes).toContainEqual({ path: '/student', methods: ['get'] });
  });

  it('should have exactly 3 routes defined', () => {
    const routes = dashboardRoutes.stack.filter((layer) => layer.route);
    expect(routes).toHaveLength(3);
  });

  it('should have middleware on GET /admin route (verifyToken, requireRole, schoolScope)', () => {
    const adminRoute = dashboardRoutes.stack.find(
      (layer) => layer.route && layer.route.path === '/admin' && layer.route.methods.get
    );
    // verifyToken + requireRole + schoolScope + controller = at least 4
    expect(adminRoute.route.stack.length).toBeGreaterThanOrEqual(4);
  });

  it('should have middleware on GET /teacher route', () => {
    const teacherRoute = dashboardRoutes.stack.find(
      (layer) => layer.route && layer.route.path === '/teacher' && layer.route.methods.get
    );
    expect(teacherRoute.route.stack.length).toBeGreaterThanOrEqual(4);
  });

  it('should have middleware on GET /student route', () => {
    const studentRoute = dashboardRoutes.stack.find(
      (layer) => layer.route && layer.route.path === '/student' && layer.route.methods.get
    );
    expect(studentRoute.route.stack.length).toBeGreaterThanOrEqual(4);
  });
});
