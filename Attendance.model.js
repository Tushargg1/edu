import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

const TEST_JWT_SECRET = 'test-jwt-secret-key';
const TEST_JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';

let mongoServer;
let notificationRoutes;

beforeAll(async () => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = TEST_JWT_REFRESH_SECRET;
  process.env.NODE_ENV = 'test';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Import via ESM to avoid model re-registration issues
  notificationRoutes = (await import('../../routes/notification.routes.js')).default;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.JWT_SECRET;
  delete process.env.JWT_REFRESH_SECRET;
  delete process.env.NODE_ENV;
});

describe('Notification Routes', () => {
  it('should export a valid Express router', () => {
    expect(notificationRoutes).toBeDefined();
    expect(notificationRoutes.stack).toBeDefined();
  });

  it('should define GET / route', () => {
    const routes = notificationRoutes.stack
      .filter((layer) => layer.route)
      .map((layer) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));

    expect(routes).toContainEqual({ path: '/', methods: ['get'] });
  });

  it('should define PATCH /:id/read route', () => {
    const routes = notificationRoutes.stack
      .filter((layer) => layer.route)
      .map((layer) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));

    expect(routes).toContainEqual({ path: '/:id/read', methods: ['patch'] });
  });

  it('should have exactly 2 routes defined', () => {
    const routes = notificationRoutes.stack.filter((layer) => layer.route);
    expect(routes).toHaveLength(2);
  });

  it('should have middleware on GET / route (verifyToken, schoolScope)', () => {
    const getRoute = notificationRoutes.stack.find(
      (layer) => layer.route && layer.route.path === '/' && layer.route.methods.get
    );
    // Route should have multiple handlers (middleware + controller)
    expect(getRoute.route.stack.length).toBeGreaterThanOrEqual(3);
  });

  it('should have middleware on PATCH /:id/read route (verifyToken, schoolScope)', () => {
    const patchRoute = notificationRoutes.stack.find(
      (layer) => layer.route && layer.route.path === '/:id/read' && layer.route.methods.patch
    );
    expect(patchRoute.route.stack.length).toBeGreaterThanOrEqual(3);
  });
});
