import { Request, Response} from 'express';
import { BettingService } from '../services/betting.service';

export class BettingController {
  static async placeBet(req: Request, res: Response) {
    try {
      const userId = res.locals.user.id;
      const { optionId, amount } = req.body as { optionId: number; amount: number };
      const bet = await BettingService.placeBet(userId, optionId, amount);
      res.status(201).json(bet);
      return;
    } catch (err: any) {
      res.status(400).json({ error: err.message });
      return;
    }
  }

  static async placeParlay(req: Request, res: Response) {
    try {
      const userId = res.locals.user.id;
      const { legs, amount } = req.body as { legs: { optionId: number }[]; amount: number };
      const parlay = await BettingService.placeParlay(userId, legs, amount);
      res.status(201).json(parlay);
      return;
    } catch (err: any) {
      res.status(400).json({ error: err.message });
      return;
    }
  }
}