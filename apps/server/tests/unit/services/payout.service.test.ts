// apps/server/tests/services/payout.service.test.ts
import { PayoutService } from '../../../src/services/payout.service';
import type { IPayoutRepository } from '../../../src/repositories/IPayoutRepository';
import type { PublicPrediction } from '@ems/types';

describe('PayoutService', () => {
  let service: PayoutService;
  let mockRepo: IPayoutRepository;

  beforeEach(() => {
    mockRepo = {
      resolvePrediction: jest.fn(),
    };
    service = new PayoutService(mockRepo);
  });

  describe('resolvePrediction', () => {
    it('delegates to repository and returns the resolved prediction', async () => {
      const predictionId = 123;
      const winningOptionId = 456;
      const mockResult: PublicPrediction = {
        id: predictionId,
        title: 'Test Prediction',
        description: 'A description',
        category: 'General',
        expiresAt: new Date('2025-12-31'),
        resolved: true,
        resolvedAt: new Date('2025-07-08'),
        approved: true,
        type: 'BINARY',
        threshold: null,
        creatorId: 42,
        winningOptionId,
      };
      (mockRepo.resolvePrediction as jest.Mock).mockResolvedValue(mockResult);

      const result = await service.resolvePrediction(predictionId, winningOptionId);

      expect(mockRepo.resolvePrediction).toHaveBeenCalledWith(predictionId, winningOptionId);
      expect(result).toBe(mockResult);
    });

    it('propagates errors thrown by the repository', async () => {
      const predictionId = 1;
      const winningOptionId = 2;
      const error = new Error('RESOLVE_FAILED');
      (mockRepo.resolvePrediction as jest.Mock).mockRejectedValue(error);

      await expect(service.resolvePrediction(predictionId, winningOptionId)).rejects.toThrow(
        'RESOLVE_FAILED',
      );
    });
  });
});
