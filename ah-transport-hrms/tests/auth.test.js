const request = require('supertest');
const app = require('../backend/src/server');

describe('Auth', () => {
  it('health ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
  it('login admin succeeds', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@ahtransport.co.in', password: 'Admin@12345' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});
