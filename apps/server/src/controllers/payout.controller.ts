
import { Request, Response} from 'express';
import { PayoutService } from '../services/payout.service';

export class PayoutController {
  static async resolvePrediction(req: Request, res: Response) {
    try {
      const predictionId = Number(req.params.id);
      const { winningOptionId } = req.body as { winningOptionId: number };
      const updated = await PayoutService.resolvePrediction(predictionId, winningOptionId);
      res.status(200).json(updated);
      return;
    } catch (err: any) {
      res.status(400).json({ error: err.message });
      return;
    }
  }
}