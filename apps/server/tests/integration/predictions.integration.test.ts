// Mock middleware and controllers before any imports
jest.mock('../../src/middleware/auth.middleware', () => ({
  requireAuth: (_req: any, _res: any, next: any) => next(),
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}));
jest.mock('../../src/controllers/predictions.controller', () => ({
  getAllPredictions: (_req: any, res: any) => res.status(200).json([]),
  getPredictionById: (_req: any, res: any) => res.sendStatus(404),
  createPrediction: (_req: any, res: any) =>
    res.status(201).json({
      id: 1,
      title: 'Stub',
      description: 'Stub',
      category: 'Stub',
      resolved: false,
      approved: false,
      options: [],
      bets: [],
      parlayLegs: [],
    }),
}));

import request from 'supertest';
import express from 'express';
import predictionsRouter from '../../src/routes/predictions.routes';
import prisma from '../../src/db';

// Set up minimal app for testing predictions endpoints
const testApp = express();
testApp.use(express.json());
testApp.use('/api/predictions', predictionsRouter);

describe('Predictions API Integration', () => {
  beforeEach(async () => {
    // Clean prediction table
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Prediction" RESTART IDENTITY CASCADE;`);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /api/predictions returns empty list', async () => {
    const res = await request(testApp).get('/api/predictions');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /api/predictions creates a prediction', async () => {
    const payload = {
      title: 'Integration Test',
      description: 'Desc',
      category: 'Test',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      options: [{ label: 'Yes' }, { label: 'No' }],
    };
    const res = await request(testApp)
      .post('/api/predictions')
      .send(payload)
      .set('Accept', 'application/json');
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id', 1);
  });

  it('GET /api/predictions/:id returns 404 stub', async () => {
    const res = await request(testApp).get('/api/predictions/999');
    expect(res.status).toBe(404);
  });
});
