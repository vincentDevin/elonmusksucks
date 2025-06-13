import type { RequestHandler } from 'express';
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

export const placeBet: RequestHandler = async (req, res, next) => {
  try {
    const userId = Number(req.body.userId);
    const predictionId = Number(req.params.id);
    const amount = Number(req.body.amount);
    const option = req.body.option;
    const bet = await predictionService.placeBet(userId, predictionId, amount, option);
    res.status(201).json(bet);
  } catch (err: any) {
    if (err.message === 'INSUFFICIENT_FUNDS') {
      res.status(400).json({ error: 'Insufficient MuskBucks' });
      return;
    }
    if (err.message === 'PREDICTION_NOT_FOUND' || err.message === 'USER_NOT_FOUND') {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err.message === 'PREDICTION_CLOSED') {
      res.status(400).json({ error: 'Prediction has expired' });
      return;
    }
    next(err);
  }
};

export const resolvePrediction: RequestHandler = async (req, res, next) => {
  try {
    const predictionId = Number(req.params.id);
    const outcome = req.body.outcome;
    const prediction = await predictionService.resolvePrediction(predictionId, outcome);
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
