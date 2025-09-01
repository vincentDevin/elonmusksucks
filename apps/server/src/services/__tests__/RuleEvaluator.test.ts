import { RuleEvaluator } from '../RuleEvaluator';
import type { AchievementEvent } from '@ems/types';

describe('RuleEvaluator', () => {
  let evaluator: RuleEvaluator;

  beforeEach(() => {
    evaluator = new RuleEvaluator();
  });

  describe('validateRuleWithErrors', () => {
    it('should reject null/missing ruleData', () => {
      const result = evaluator.validateRuleWithErrors(null);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain('ruleData missing/null for auto award');
    });

    it('should reject missing progress.when', () => {
      const rule = {
        eventKeys: ['pong:match:completed'],
        progress: { kind: 'count' },
        // missing unlockWhen
      };
      const result = evaluator.validateRuleWithErrors(rule);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain('progress.when missing');
    });

    it('should reject streak without resetIf', () => {
      const rule = {
        eventKeys: ['pong:match:completed'],
        progress: { kind: 'streak', incrementIf: { 'data.winnerId': '$.userId' } },
        unlockWhen: { 'progress >=': 3 },
      };
      const result = evaluator.validateRuleWithErrors(rule);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain('streak rules require progress.resetIf');
    });

    it('should accept valid count rule', () => {
      const rule = {
        eventKeys: ['pong:match:completed'],
        progress: { kind: 'count', incrementIf: { 'data.winnerId': '$.userId' } },
        unlockWhen: { 'progress >=': 1 },
      };
      const result = evaluator.validateRuleWithErrors(rule);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept valid streak rule with resetIf', () => {
      const rule = {
        eventKeys: ['pong:match:completed'],
        progress: {
          kind: 'streak',
          incrementIf: { 'data.winnerId': '$.userId' },
          resetIf: { 'data.loserId': '$.userId' },
        },
        unlockWhen: { 'progress >=': 3 },
      };
      const result = evaluator.validateRuleWithErrors(rule);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('placeholder resolution', () => {
    it('should resolve $.userId placeholder', () => {
      const event: AchievementEvent = {
        key: 'pong:match:completed',
        userId: 42,
        occurredAt: '2023-01-01T00:00:00Z',
        idempotencyKey: 'test',
        payload: { winnerId: 42, loserId: 99 },
      };

      const rule = {
        eventKeys: ['pong:match:completed'],
        progress: { kind: 'count', incrementIf: { 'data.winnerId': '$.userId' } },
        unlockWhen: { 'progress >=': 1 },
      };

      const result = evaluator.evaluateRule(rule, event, 0, {});
      expect(result.shouldIncrement).toBe(true);
    });

    it('should handle data.* paths in payload', () => {
      const event: AchievementEvent = {
        key: 'pong:match:completed',
        userId: 42,
        occurredAt: '2023-01-01T00:00:00Z',
        idempotencyKey: 'test',
        payload: { winnerId: 42, wager: 1000 },
      };

      const rule = {
        eventKeys: ['pong:match:completed'],
        progress: { kind: 'binary', incrementIf: { 'data.wager': 1000 } },
        unlockWhen: { 'progress >=': 1 },
      };

      const result = evaluator.evaluateRule(rule, event, 0, {});
      expect(result.shouldIncrement).toBe(true);
    });
  });
});
