const request = require('supertest');
const { app, server } = require('../src/index');

describe('Auth Endpoints', () => {
  afterAll(async () => {
    await server.close();
  });

  it('should return 401 if no token is provided for protected route', async () => {
    const res = await request(app)
      .get('/api/profiles/me');
    
    expect(res.statusCode).toEqual(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('AUTH_TOKEN_REQUIRED');
  });

  it('should return 404 for unknown routes', async () => {
    const res = await request(app)
      .get('/api/unknown-route');
    
    expect(res.statusCode).toEqual(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
