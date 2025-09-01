import request from 'supertest';
import app from './app.js';

describe('health endpoint', () => {
  it('returns ok true', async () => {
    const res = await request(app).get('/healthz').expect(200);
    expect(res.body).toEqual({ ok: true });
  });
});
