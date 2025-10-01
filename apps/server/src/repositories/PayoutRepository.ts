// apps/server/src/repositories/PayoutRepository.ts
import { PrismaClient, Prisma } from '@prisma/client';
import type { IPayoutRepository } from './interfaces/IPayoutRepository';
import type { PublicPrediction, DbUserStats } from '@ems/types';
import { REDIS_CHANNELS } from '@ems/types';
import { serializeBigInt } from '../utils/bigintSerializer';
import { eventBus } from '../lib/EventBus';

const prisma = new PrismaClient();

export class PayoutRepository implements IPayoutRepository {
  private eventBus = eventBus;
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
          include: {
            options: true,
            category: true,
          },
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

            // Use the BigInt serialization utility
            const serializedPayload = serializeBigInt(betStatusPayload);

            // Publish to single channel - handler will route to user room
            await this.eventBus.publish(REDIS_CHANNELS.BET_STATUS_CHANGE, serializedPayload);
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
                  subtype: 'BET_PAYOUT',
                  amount: payoutAmount,
                  balanceAfter: newBal,
                  description: `Bet payout: "${updatedPrediction.title}"`,
                  metadata: {
                    predictionId,
                    predictionTitle: updatedPrediction.title,
                    predictionCategory: updatedPrediction.category?.name ?? null,
                    betId: b.id,
                    winningOptionId,
                    originalAmount: Number(b.amount),
                    payoutAmount: Number(payoutAmount),
                    odds: Number(b.oddsAtPlacement),
                  },
                  relatedBetId: b.id,
                  relatedParlayId: null,
                },
              });

              // Publish user balance snapshot event for balance-based achievements
              try {
                const stats = await tx.userStats.findUnique({ where: { userId: user.id } });
                await this.eventBus.publish('user:balance:snapshot', {
                  key: 'user:balance:snapshot',
                  userId: user.id,
                  occurredAt: new Date().toISOString(),
                  idempotencyKey: `balance:snapshot:${user.id}:payout:${b.id}`,
                  payload: {
                    balance: Number(newBal),
                    previousBalance: Number(user.muskBucks),
                    changeAmount: Number(payoutAmount),
                    changeReason: 'bet_won',
                    betId: b.id,
                    predictionId,
                    // Include stats for achievements
                    totalWagered: stats ? Number(stats.totalWagered) : 0,
                    totalWon: stats
                      ? Number(stats.totalWon) + Number(payoutAmount)
                      : Number(payoutAmount),
                    totalLost: stats
                      ? Number(stats.totalWagered) - (Number(stats.totalWon) + Number(payoutAmount))
                      : 0,
                    netProfit: stats
                      ? Number(stats.profit) + Number(payoutAmount)
                      : Number(payoutAmount),
                    totalBets: stats ? stats.totalBets : 1,
                    winRate:
                      stats && stats.totalBets > 0 ? (stats.betsWon + 1) / stats.totalBets : 1,
                  },
                });
              } catch (achievementError) {
                console.error(
                  '[payout] Error publishing balance snapshot event:',
                  achievementError,
                );
              }
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

            await this.eventBus.publish(REDIS_CHANNELS.USER_STATS_UPDATE, statsUpdatePayload);
          } catch (error) {
            console.error('[payout] Error publishing stats update event:', error);
          }

          // Publish JSON rule achievement event for bet resolution
          try {
            await this.eventBus.publish(isWinner ? 'bet:won' : 'bet:lost', {
              key: isWinner ? 'bet:won' : 'bet:lost',
              userId: b.userId,
              occurredAt: new Date().toISOString(),
              idempotencyKey: `bet:${b.id}:${isWinner ? 'won' : 'lost'}`,
              payload: {
                betId: b.id,
                predictionId,
                amount: Number(b.amount),
                payout: Number(payoutAmount),
                won: isWinner,
                category: updatedPrediction.category?.name ?? null,
                odds: Number(b.oddsAtPlacement),
                wasAllIn: b.wasAllIn,
              },
            });
          } catch (error) {
            console.error('[payout] Error publishing bet resolution achievement event:', error);
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
              option: {
                include: {
                  prediction: {
                    include: {
                      category: true,
                    },
                  },
                },
              },
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
            const serializedParlayStatusPayload = serializeBigInt(parlayStatusPayload);
            await this.eventBus.publish(
              REDIS_CHANNELS.PARLAY_STATUS_CHANGE,
              serializedParlayStatusPayload,
            );
          } catch (error) {
            console.error('[payout] Error publishing parlay status change:', error);
          }

          if (!lost) {
            const newBal = parlay.user.muskBucks + BigInt(payoutAmount);
            await tx.user.update({ where: { id: parlay.userId }, data: { muskBucks: newBal } });
            // Get prediction titles for description
            const predictionTitles = legs.map((leg) => leg.option.prediction.title);
            const shortDescription =
              predictionTitles.length <= 2
                ? predictionTitles.join(' + ')
                : `${predictionTitles[0]} + ${predictionTitles.length - 1} others`;

            await tx.transaction.create({
              data: {
                userId: parlay.userId,
                type: 'CREDIT',
                subtype: 'PARLAY_PAYOUT',
                amount: BigInt(payoutAmount),
                balanceAfter: newBal,
                description: `Parlay payout (${legsWon}/${legCount}): ${shortDescription}`,
                metadata: {
                  parlayId: parlay.id,
                  legCount,
                  legsWon,
                  legsLost: legCount - legsWon,
                  originalAmount: Number(parlay.amount),
                  payoutAmount: Number(payoutAmount),
                  combinedOdds: Number(parlay.potentialPayout || BigInt(0)) / Number(parlay.amount),
                  predictions: legs.map((leg) => ({
                    id: leg.option.prediction.id,
                    title: leg.option.prediction.title,
                    category: leg.option.prediction.category?.name ?? null,
                    won: leg.optionId === leg.option.prediction.winningOptionId,
                  })),
                },
                relatedBetId: null,
                relatedParlayId: parlay.id,
              },
            });

            // Publish user balance snapshot event for balance-based achievements
            try {
              const stats = await tx.userStats.findUnique({ where: { userId: parlay.userId } });
              await this.eventBus.publish('user:balance:snapshot', {
                key: 'user:balance:snapshot',
                userId: parlay.userId,
                occurredAt: new Date().toISOString(),
                idempotencyKey: `balance:snapshot:${parlay.userId}:parlay:${parlay.id}`,
                payload: {
                  balance: Number(newBal),
                  previousBalance: Number(parlay.user.muskBucks),
                  changeAmount: Number(payoutAmount),
                  changeReason: 'parlay_won',
                  parlayId: parlay.id,
                  predictionId,
                  // Include stats for achievements
                  totalWagered: stats ? Number(stats.totalWagered) : 0,
                  totalWon: stats
                    ? Number(stats.totalWon) + Number(payoutAmount)
                    : Number(payoutAmount),
                  totalLost: stats
                    ? Number(stats.totalWagered) - (Number(stats.totalWon) + Number(payoutAmount))
                    : 0,
                  netProfit: stats
                    ? Number(stats.profit) + Number(payoutAmount)
                    : Number(payoutAmount),
                  totalBets: stats ? stats.totalBets : 0,
                  totalParlays: stats ? stats.totalParlays : 1,
                  winRate: stats && stats.totalBets > 0 ? stats.betsWon / stats.totalBets : 0,
                },
              });
            } catch (achievementError) {
              console.error(
                '[payout] Error publishing parlay balance snapshot event:',
                achievementError,
              );
            }
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

            await this.eventBus.publish(REDIS_CHANNELS.USER_STATS_UPDATE, statsUpdatePayload);
          } catch (error) {
            console.error('[payout] Error publishing parlay stats update event:', error);
          }

          // Trigger achievement checks for parlay resolution
          try {
            // Parlay achievements are already triggered in betting.service when parlay is placed
            // Here we check win/loss related achievements after resolution

            // Publish JSON rule achievement event for parlay resolution
            const parlayEventPayload = {
              key: lost ? 'parlay:lost' : 'parlay:won',
              userId: parlay.userId,
              occurredAt: new Date().toISOString(),
              idempotencyKey: `parlay:${parlayId}:${lost ? 'lost' : 'won'}`,
              payload: {
                parlayId,
                legCount,
                legsWon,
                amount: parlay.amount, // Keep as BigInt - let rule evaluation handle conversion
                payout: lost ? BigInt(0) : payoutAmount, // Keep as BigInt
                won: !lost,
                odds: Number(parlay.potentialPayout || BigInt(0)) / Number(parlay.amount), // Safe conversion for odds calculation
              },
            };
            const serializedParlayPayload = serializeBigInt(parlayEventPayload);
            await this.eventBus.publish(
              lost ? 'parlay:lost' : 'parlay:won',
              serializedParlayPayload,
            );
          } catch (error) {
            console.error('[payout] Error checking achievements for parlay resolution:', error);
          }
        }

        return updatedPrediction;
      },
    );
  }
}
