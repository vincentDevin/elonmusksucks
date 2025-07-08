import app from '../../../src/index';
import request from 'supertest';

describe('GET /health', () => {
  it('responds 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});
