// apps/server/src/repositories/PayoutRepository.ts
import { PrismaClient, Prisma } from '@prisma/client';
import type { IPayoutRepository } from './IPayoutRepository';
import type { PublicPrediction, DbUserStats } from '@ems/types';
import redisClient from '../lib/redis';
import { achievementService } from '../services/achievement.service';
import { achievementEvaluatorService } from '../services/achievementEvaluator.service';

const prisma = new PrismaClient();

export class PayoutRepository implements IPayoutRepository {
  /**
   * Quickly set the winning option so the worker can process payouts.
   * Does not mark the prediction fully resolved.
   */
  async markResolving(predictionId: number, winningOptionId: number): Promise<void> {
    await prisma.prediction.update({
      where: { id: predictionId },
      data: {
        // store chosen winningOptionId; leave 'resolved' until worker
        winningOptionId,
      },
    });
  }

  /**
   * Full resolution logic; intended for background worker.
   */
  async resolvePrediction(
    predictionId: number,
    winningOptionId: number,
  ): Promise<PublicPrediction> {
    return await prisma.$transaction(
      async (tx: Prisma.TransactionClient): Promise<PublicPrediction> => {
        // --- STEP 1: mark prediction resolved & grab updated prediction ---
        const updatedPrediction = await tx.prediction.update({
          where: { id: predictionId },
          data: {
            resolved: true,
            winningOptionId,
            resolvedAt: new Date(),
          },
          include: { options: true },
        });

        // --- STEP 2: process single bets ---
        const bets = await tx.bet.findMany({ where: { predictionId } });
        for (const b of bets) {
          const isWinner = b.optionId === winningOptionId;
          // Rollback: Change back to b.potentialPayout ?? 0
          const payoutAmount = isWinner ? (b.potentialPayout ?? BigInt(0)) : BigInt(0);

          await tx.bet.update({
            where: { id: b.id },
            data: {
              status: isWinner ? 'WON' : 'LOST',
              won: isWinner,
              payout: isWinner ? b.potentialPayout : undefined,
            },
          });

          // Publish bet status change event for real-time updates
          try {
            const betStatusPayload = {
              betId: b.id,
              userId: b.userId,
              predictionId,
              status: isWinner ? 'WON' : 'LOST',
              amount: b.amount,
              payout: isWinner ? (b.potentialPayout ?? 0) : 0,
              timestamp: new Date().toISOString(),
            };

            // Publish to single channel - handler will route to user room
            await redisClient.publish('bet:status_change', JSON.stringify(betStatusPayload));
          } catch (error) {
            console.error('[payout] Error publishing bet status change:', error);
          }

          if (isWinner) {
            const user = await tx.user.findUnique({ where: { id: b.userId } });
            if (user) {
              const newBal = user.muskBucks + payoutAmount;
              await tx.user.update({ where: { id: user.id }, data: { muskBucks: newBal } });
              await tx.transaction.create({
                data: {
                  userId: user.id,
                  type: 'CREDIT',
                  amount: payoutAmount,
                  balanceAfter: newBal,
                  relatedBetId: b.id,
                  relatedParlayId: null,
                },
              });
            }
          }

          const statsBefore = await tx.userStats.findUnique({ where: { userId: b.userId } });
          const prevStats: DbUserStats = await tx.userStats.upsert({
            where: { userId: b.userId },
            create: {
              userId: b.userId,
              totalBets: 1,
              betsWon: isWinner ? 1 : 0,
              betsLost: isWinner ? 0 : 1,
              totalParlays: 0,
              parlaysWon: 0,
              parlaysLost: 0,
              totalParlayLegs: 0,
              parlayLegsWon: 0,
              parlayLegsLost: 0,
              totalWagered: b.amount,
              totalWon: BigInt(payoutAmount),
              profit: BigInt(payoutAmount) - b.amount,
              roi: 0,
              currentStreak: isWinner ? (statsBefore?.currentStreak ?? 0) + 1 : 0,
              longestStreak: isWinner
                ? Math.max(statsBefore?.longestStreak ?? 0, (statsBefore?.currentStreak ?? 0) + 1)
                : (statsBefore?.longestStreak ?? 0),
              mostCommonBet: null,
              biggestWin: BigInt(payoutAmount),
            },
            update: {
              totalBets: { increment: 1 },
              betsWon: isWinner ? { increment: 1 } : undefined,
              betsLost: !isWinner ? { increment: 1 } : undefined,
              totalWagered: { increment: b.amount },
              totalWon: { increment: BigInt(payoutAmount) },
              profit: { increment: BigInt(payoutAmount) - b.amount },
              biggestWin: {
                set:
                  BigInt(payoutAmount) > (statsBefore?.biggestWin ?? BigInt(0))
                    ? BigInt(payoutAmount)
                    : (statsBefore?.biggestWin ?? BigInt(0)),
              },
              currentStreak: isWinner ? { set: (statsBefore?.currentStreak ?? 0) + 1 } : { set: 0 },
              longestStreak: isWinner
                ? {
                    set: Math.max(
                      statsBefore?.longestStreak ?? 0,
                      (statsBefore?.currentStreak ?? 0) + 1,
                    ),
                  }
                : undefined,
            },
          });

          await tx.userStats.update({
            where: { userId: b.userId },
            data: {
              roi:
                Number(prevStats.profit + (BigInt(payoutAmount) - b.amount)) /
                Number(prevStats.totalWagered + b.amount),
            },
          });

          // Trigger enhanced stats update after basic stats are updated
          try {
            const statsUpdatePayload = {
              userId: b.userId,
              reason: 'bet_resolved',
              betId: b.id,
              predictionId,
              status: isWinner ? 'WON' : 'LOST',
              timestamp: new Date().toISOString(),
            };

            await redisClient.publish('user:stats_update', JSON.stringify(statsUpdatePayload));
          } catch (error) {
            console.error('[payout] Error publishing stats update event:', error);
          }

          // Trigger achievement checks for bet resolution
          try {
            // Check bet won/lost achievements
            await achievementService.checkAndUpdateAchievements({
              type: isWinner ? 'bet_won' : 'bet_lost',
              userId: b.userId,
              data: {
                betId: b.id,
                predictionId,
                amount: Number(b.amount),
                payout: Number(payoutAmount),
                category: updatedPrediction.category,
              },
            });

            // Check streak achievements (only if this was a win/loss that affected streak)
            const updatedStats = await tx.userStats.findUnique({ where: { userId: b.userId } });
            if (updatedStats) {
              await achievementService.checkAndUpdateAchievements({
                type: 'streak_updated',
                userId: b.userId,
                data: {
                  currentStreak: updatedStats.currentStreak,
                  longestStreak: updatedStats.longestStreak,
                },
              });

              // Check accuracy achievements
              const winRate =
                updatedStats.totalBets > 0
                  ? (updatedStats.betsWon / updatedStats.totalBets) * 100
                  : 0;
              await achievementService.checkAndUpdateAchievements({
                type: 'accuracy_updated',
                userId: b.userId,
                data: {
                  winRate,
                  totalBets: updatedStats.totalBets,
                  betsWon: updatedStats.betsWon,
                },
              });

              // Check volume achievements
              await achievementService.checkAndUpdateAchievements({
                type: 'volume_updated',
                userId: b.userId,
                data: {
                  totalWagered: Number(updatedStats.totalWagered),
                  totalBets: updatedStats.totalBets,
                  biggestWin: Number(updatedStats.biggestWin),
                },
              });

              // Check profit achievements
              await achievementService.checkAndUpdateAchievements({
                type: 'profit_updated',
                userId: b.userId,
                data: {
                  profit: Number(updatedStats.profit),
                  totalWon: Number(updatedStats.totalWon),
                  roi: updatedStats.roi,
                },
              });
            }

            // Advanced achievement evaluator for bet resolution
            await achievementEvaluatorService.processAchievementEvent({
              type: isWinner ? 'bet_won' : 'bet_lost',
              userId: b.userId,
              timestamp: new Date().toISOString(),
              data: {
                betId: b.id,
                predictionId,
                amount: Number(b.amount),
                payout: Number(payoutAmount),
                category: updatedPrediction.category,
                odds: Number(b.oddsAtPlacement),
              },
            });

            // Advanced achievement evaluator for streak updates
            if (updatedStats) {
              await achievementEvaluatorService.processAchievementEvent({
                type: 'streak_updated',
                userId: b.userId,
                timestamp: new Date().toISOString(),
                data: {
                  currentStreak: updatedStats.currentStreak,
                  longestStreak: updatedStats.longestStreak,
                  previousStreak: statsBefore?.currentStreak || 0,
                },
              });
            }
          } catch (error) {
            console.error('[payout] Error checking achievements for bet resolution:', error);
          }
        }

        // --- STEP 3: process parlays ---
        const affected = await tx.parlayLeg.findMany({
          where: { option: { predictionId } },
          select: { parlayId: true },
        });
        const parlayIds = Array.from(new Set(affected.map((l) => l.parlayId)));

        for (const parlayId of parlayIds) {
          const legs = await tx.parlayLeg.findMany({
            where: { parlayId },
            include: {
              option: { include: { prediction: true } },
              parlay: { include: { user: true } },
            },
          });
          if (!legs.every((l) => l.option.prediction.resolved)) continue;

          const parlay = legs[0].parlay;
          const legCount = legs.length;
          const legsWon = legs.filter(
            (l) => l.optionId === l.option.prediction.winningOptionId,
          ).length;
          const lost = legsWon < legCount;
          const payoutAmount = lost ? 0 : parlay.potentialPayout;

          await tx.parlay.update({
            where: { id: parlayId },
            data: { status: lost ? 'LOST' : 'WON' },
          });

          // Publish parlay status change event for real-time updates
          try {
            const parlayStatusPayload = {
              parlayId,
              userId: parlay.userId,
              status: lost ? 'LOST' : 'WON',
              amount: parlay.amount,
              payout: lost ? 0 : payoutAmount,
              legCount,
              legsWon,
              timestamp: new Date().toISOString(),
            };

            // Publish to single channel - handler will route to user room
            await redisClient.publish('parlay:status_change', JSON.stringify(parlayStatusPayload));
          } catch (error) {
            console.error('[payout] Error publishing parlay status change:', error);
          }

          if (!lost) {
            const newBal = parlay.user.muskBucks + BigInt(payoutAmount);
            await tx.user.update({ where: { id: parlay.userId }, data: { muskBucks: newBal } });
            await tx.transaction.create({
              data: {
                userId: parlay.userId,
                type: 'CREDIT',
                amount: BigInt(payoutAmount),
                balanceAfter: newBal,
                relatedBetId: null,
                relatedParlayId: parlay.id,
              },
            });
          }

          const statsBefore = await tx.userStats.findUnique({ where: { userId: parlay.userId } });
          const prevP: DbUserStats = await tx.userStats.upsert({
            where: { userId: parlay.userId },
            create: {
              userId: parlay.userId,
              totalBets: 0,
              betsWon: 0,
              betsLost: 0,
              totalParlays: 1,
              parlaysWon: lost ? 0 : 1,
              parlaysLost: lost ? 1 : 0,
              totalParlayLegs: legCount,
              parlayLegsWon: legsWon,
              parlayLegsLost: legCount - legsWon,
              totalWagered: parlay.amount,
              totalWon: BigInt(payoutAmount),
              profit: BigInt(payoutAmount) - parlay.amount,
              roi: 0,
              currentStreak: lost ? 0 : (statsBefore?.currentStreak ?? 0) + 1,
              longestStreak: lost
                ? (statsBefore?.longestStreak ?? 0)
                : Math.max(statsBefore?.longestStreak ?? 0, (statsBefore?.currentStreak ?? 0) + 1),
              mostCommonBet: null,
              biggestWin: BigInt(payoutAmount),
            },
            update: {
              totalParlays: { increment: 1 },
              parlaysWon: lost ? undefined : { increment: 1 },
              parlaysLost: lost ? { increment: 1 } : undefined,
              totalParlayLegs: { increment: legCount },
              parlayLegsWon: { increment: legsWon },
              parlayLegsLost: { increment: legCount - legsWon },
              totalWagered: { increment: parlay.amount },
              totalWon: { increment: BigInt(payoutAmount) },
              profit: { increment: BigInt(payoutAmount) - parlay.amount },
              biggestWin: {
                set:
                  BigInt(payoutAmount) > (statsBefore?.biggestWin ?? BigInt(0))
                    ? BigInt(payoutAmount)
                    : (statsBefore?.biggestWin ?? BigInt(0)),
              },
              currentStreak: lost ? { set: 0 } : { set: (statsBefore?.currentStreak ?? 0) + 1 },
              longestStreak: lost
                ? undefined
                : {
                    set: Math.max(
                      statsBefore?.longestStreak ?? 0,
                      (statsBefore?.currentStreak ?? 0) + 1,
                    ),
                  },
            },
          });

          await tx.userStats.update({
            where: { userId: parlay.userId },
            data: {
              roi:
                Number(prevP.profit + (BigInt(payoutAmount) - parlay.amount)) /
                Number(prevP.totalWagered + parlay.amount),
            },
          });

          // Trigger enhanced stats update after parlay stats are updated
          try {
            const statsUpdatePayload = {
              userId: parlay.userId,
              reason: 'parlay_resolved',
              parlayId,
              status: lost ? 'LOST' : 'WON',
              legCount,
              legsWon,
              timestamp: new Date().toISOString(),
            };

            await redisClient.publish('user:stats_update', JSON.stringify(statsUpdatePayload));
          } catch (error) {
            console.error('[payout] Error publishing parlay stats update event:', error);
          }

          // Trigger achievement checks for parlay resolution
          try {
            // Parlay achievements are already triggered in betting.service when parlay is placed
            // Here we check win/loss related achievements after resolution

            // Check streak achievements for parlays
            const updatedStats = await tx.userStats.findUnique({
              where: { userId: parlay.userId },
            });
            if (updatedStats) {
              await achievementService.checkAndUpdateAchievements({
                type: 'streak_updated',
                userId: parlay.userId,
                data: {
                  currentStreak: updatedStats.currentStreak,
                  longestStreak: updatedStats.longestStreak,
                },
              });

              // Check volume achievements (parlays contribute to volume)
              await achievementService.checkAndUpdateAchievements({
                type: 'volume_updated',
                userId: parlay.userId,
                data: {
                  totalWagered: Number(updatedStats.totalWagered),
                  totalBets: updatedStats.totalBets + updatedStats.totalParlays,
                  biggestWin: Number(updatedStats.biggestWin),
                },
              });

              // Check profit achievements
              await achievementService.checkAndUpdateAchievements({
                type: 'profit_updated',
                userId: parlay.userId,
                data: {
                  profit: Number(updatedStats.profit),
                  totalWon: Number(updatedStats.totalWon),
                  roi: updatedStats.roi,
                },
              });
            }

            // Advanced achievement evaluator for parlay resolution
            await achievementEvaluatorService.processAchievementEvent({
              type: lost ? 'parlay_lost' : 'parlay_won',
              userId: parlay.userId,
              timestamp: new Date().toISOString(),
              data: {
                parlayId,
                legCount,
                legsWon,
                payout: lost ? 0 : Number(payoutAmount),
                amount: Number(parlay.amount),
              },
            });

            // Advanced achievement evaluator for streak updates (parlay)
            if (updatedStats) {
              await achievementEvaluatorService.processAchievementEvent({
                type: 'streak_updated',
                userId: parlay.userId,
                timestamp: new Date().toISOString(),
                data: {
                  currentStreak: updatedStats.currentStreak,
                  longestStreak: updatedStats.longestStreak,
                  previousStreak: statsBefore?.currentStreak || 0,
                },
              });
            }
          } catch (error) {
            console.error('[payout] Error checking achievements for parlay resolution:', error);
          }
        }

        return updatedPrediction;
      },
    );
  }
}
