import { Request, Response } from 'express';
import prisma from '../db';

export const getAllPredictions = async (_req: Request, res: Response) => {
  const predictions = await prisma.prediction.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json(predictions);
};

export const createPrediction = async (req: Request, res: Response) => {
  const { title, description, category, expiresAt } = req.body;

  try {
    const prediction = await prisma.prediction.create({
      data: {
        title,
        description,
        category,
        expiresAt: new Date(expiresAt),
      },
    });
    res.status(201).json(prediction);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create prediction' });
  }
};
