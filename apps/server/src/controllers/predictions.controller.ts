import type { RequestHandler } from 'express';
import { PayoutService } from '../services/payout.service';
import * as predictionService from '../services/predictions.service';

export const getAllPredictions: RequestHandler = async (_req, res, next) => {
  try {
    const predictions = await predictionService.listAllPredictions();
    res.json(predictions);
  } catch (err) {
    next(err);
  }
};

export const getPredictionById: RequestHandler = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const prediction = await predictionService.getPrediction(id);
    if (!prediction) {
      res.status(404).json({ error: 'Prediction not found' });
      return;
    }
    res.json(prediction);
  } catch (err) {
    next(err);
  }
};

export const createPrediction: RequestHandler = async (req, res, next) => {
  try {
    const { title, description, category, expiresAt } = req.body;
    const prediction = await predictionService.createPrediction({
      title,
      description,
      category,
      expiresAt: new Date(expiresAt),
    });
    res.status(201).json(prediction);
  } catch (err) {
    next(err);
  }
};


export const resolvePrediction: RequestHandler = async (req, res, next) => {
  try {
    const predictionId = Number(req.params.id);
    const { winningOptionId } = req.body as { winningOptionId: number };
    const prediction = await PayoutService.resolvePrediction(predictionId, winningOptionId);
    res.json(prediction);
  } catch (err) {
    next(err);
  }
};

export const getLeaderboard: RequestHandler = async (_req, res, next) => {
  try {
    const leaderboard = await predictionService.getLeaderboard();
    res.json(leaderboard);
  } catch (err) {
    next(err);
  }
};
