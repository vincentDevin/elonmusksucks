// apps/client/src/components/debug/EventFlowTest.tsx
// -----------------------------------------------------------------------------
// Comprehensive test component for the EventBus system
// Tests complete event flow from backend to UI with all event categories
// -----------------------------------------------------------------------------

import { useState, useCallback, useEffect } from 'react';
import { useEventBusCore, useSocketEvent } from '../../contexts/EventBusCoreContext';
import { useEventBusMetrics } from '../../contexts/EventBusMetricsContext';
import { REDIS_CHANNELS } from '@ems/types';
import type {
  BetPlacedPayload,
  ChatMessagePayload,
  LeaderboardUpdatePayload,
  PongMatchStartPayload,
  UserFollowPayload,
  ArticlePublishedPayload,
  AchievementUnlockedPayload,
  StatsUpdatePayload,
  BalanceUpdatePayload,
} from '@ems/types';

interface TestResult {
  event: string;
  status: 'pending' | 'success' | 'error';
  timestamp: number;
  payload?: any;
  error?: string;
}

export default function EventFlowTest() {
  const { emit, isConnected } = useEventBusCore();
  const { eventMetrics } = useEventBusMetrics();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [receivedEvents, setReceivedEvents] = useState<string[]>([]);

  // Track received events for verification
  const handleEventReceived = useCallback((eventName: string) => {
    return (payload: any) => {
      console.log(`[EventFlowTest] Received ${eventName}:`, payload);
      setReceivedEvents((prev) => [...prev, eventName]);
      setTestResults((prev) =>
        prev.map((result) =>
          result.event === eventName
            ? { ...result, status: 'success', payload, timestamp: Date.now() }
            : result,
        ),
      );
    };
  }, []);

  // Subscribe to test events
  useSocketEvent(REDIS_CHANNELS.BET_PLACED, handleEventReceived('bet:placed'));
  useSocketEvent(REDIS_CHANNELS.CHAT_MESSAGE, handleEventReceived('chat:message'));
  useSocketEvent(REDIS_CHANNELS.LEADERBOARD_UPDATE, handleEventReceived('leaderboard:update'));
  useSocketEvent(REDIS_CHANNELS.PONG_MATCH_START, handleEventReceived('pong:match:start'));
  useSocketEvent(REDIS_CHANNELS.USER_FOLLOW, handleEventReceived('user:follow'));
  useSocketEvent(REDIS_CHANNELS.ARTICLE_PUBLISHED, handleEventReceived('article:published'));
  useSocketEvent(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED, handleEventReceived('achievement:unlocked'));
  useSocketEvent(REDIS_CHANNELS.STATS_UPDATE, handleEventReceived('stats:update'));
  useSocketEvent(REDIS_CHANNELS.BALANCE_UPDATE, handleEventReceived('balance:update'));

  // Test event payloads
  const testEvents = [
    {
      name: 'bet:placed',
      channel: REDIS_CHANNELS.BET_PLACED,
      payload: {
        userId: 1,
        betId: 'test-bet-123',
        predictionId: 1,
        optionId: 1,
        amount: 100,
        odds: 2.5,
        potentialPayout: 250,
        timestamp: new Date().toISOString(),
      } as BetPlacedPayload,
    },
    {
      name: 'chat:message',
      channel: REDIS_CHANNELS.CHAT_MESSAGE,
      payload: {
        user: { id: 1, name: 'Test User', role: 'USER', avatarUrl: null },
        message: 'Test message from EventBus',
        timestamp: new Date().toISOString(),
        id: Date.now(),
      } as ChatMessagePayload,
    },
    {
      name: 'leaderboard:update',
      channel: REDIS_CHANNELS.LEADERBOARD_UPDATE,
      payload: {
        type: 'profit',
        leaderboard: [
          { userId: 1, rank: 1, value: 1000, change: 5 },
          { userId: 2, rank: 2, value: 800, change: -1 },
        ],
        timestamp: new Date().toISOString(),
      } as LeaderboardUpdatePayload,
    },
    {
      name: 'pong:match:start',
      channel: REDIS_CHANNELS.PONG_MATCH_START,
      payload: {
        matchId: 'test-match-123',
        player1: { id: 1, name: 'Player 1', elo: 1200 },
        player2: { id: 2, name: 'Player 2', elo: 1180 },
        timestamp: new Date().toISOString(),
      } as PongMatchStartPayload,
    },
    {
      name: 'user:follow',
      channel: REDIS_CHANNELS.USER_FOLLOW,
      payload: {
        followerId: 1,
        followeeId: 2,
        followerName: 'Test Follower',
        followeeName: 'Test Followee',
        timestamp: new Date().toISOString(),
      } as UserFollowPayload,
    },
    {
      name: 'article:published',
      channel: REDIS_CHANNELS.ARTICLE_PUBLISHED,
      payload: {
        articleId: 'test-article-123',
        title: 'Test Article',
        url: 'https://example.com/test',
        summary: 'Test article summary',
        timestamp: new Date().toISOString(),
      } as ArticlePublishedPayload,
    },
    {
      name: 'achievement:unlocked',
      channel: REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED,
      payload: {
        userId: 1,
        achievementId: 'test-achievement',
        title: 'Test Achievement',
        description: 'Achievement unlocked via EventBus test',
        category: 'testing',
        points: 100,
        timestamp: new Date().toISOString(),
      } as AchievementUnlockedPayload,
    },
    {
      name: 'stats:update',
      channel: REDIS_CHANNELS.STATS_UPDATE,
      payload: {
        userId: 1,
        type: 'betting',
        stats: {
          totalBets: 10,
          winRate: 0.6,
          profit: 500,
        },
        timestamp: new Date().toISOString(),
      } as StatsUpdatePayload,
    },
    {
      name: 'balance:update',
      channel: REDIS_CHANNELS.BALANCE_UPDATE,
      payload: {
        userId: 1,
        oldBalance: 1000,
        newBalance: 1100,
        change: 100,
        reason: 'test_payout',
        timestamp: new Date().toISOString(),
      } as BalanceUpdatePayload,
    },
  ];

  const runEventFlowTest = useCallback(async () => {
    setIsRunning(true);
    setTestResults([]);
    setReceivedEvents([]);

    console.log('[EventFlowTest] Starting comprehensive event flow test...');

    // Initialize test results
    const initialResults: TestResult[] = testEvents.map((event) => ({
      event: event.name,
      status: 'pending',
      timestamp: Date.now(),
    }));
    setTestResults(initialResults);

    // Emit test events with delays
    for (const [index, testEvent] of testEvents.entries()) {
      try {
        console.log(`[EventFlowTest] Emitting ${testEvent.name}:`, testEvent.payload);
        emit(testEvent.channel, testEvent.payload);

        // Small delay between events
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`[EventFlowTest] Error emitting ${testEvent.name}:`, error);
        setTestResults((prev) =>
          prev.map((result) =>
            result.event === testEvent.name
              ? { ...result, status: 'error', error: String(error), timestamp: Date.now() }
              : result,
          ),
        );
      }
    }

    // Wait for events to be processed
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mark remaining pending events as errors
    setTestResults((prev) =>
      prev.map((result) =>
        result.status === 'pending'
          ? {
              ...result,
              status: 'error',
              error: 'Event not received within timeout',
              timestamp: Date.now(),
            }
          : result,
      ),
    );

    setIsRunning(false);
    console.log('[EventFlowTest] Event flow test completed');
  }, [emit, testEvents]);

  const clearResults = () => {
    setTestResults([]);
    setReceivedEvents([]);
  };

  const metrics = eventMetrics;
  const successCount = testResults.filter((r) => r.status === 'success').length;
  const errorCount = testResults.filter((r) => r.status === 'error').length;
  const pendingCount = testResults.filter((r) => r.status === 'pending').length;

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-md">
      {/* Test Control Panel */}
      <div className="bg-surface border border-border rounded-lg shadow-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-content text-sm">EventBus Flow Test</h3>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>

        <div className="flex space-x-2 mb-3">
          <button
            onClick={runEventFlowTest}
            disabled={isRunning || !isConnected}
            className="px-3 py-1 bg-primary text-white text-xs rounded hover:bg-primary-hover disabled:opacity-50"
          >
            {isRunning ? 'Testing...' : 'Run Test'}
          </button>
          <button
            onClick={clearResults}
            disabled={isRunning}
            className="px-3 py-1 bg-muted text-content text-xs rounded hover:bg-surface disabled:opacity-50"
          >
            Clear
          </button>
        </div>

        {/* Test Results Summary */}
        {testResults.length > 0 && (
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-tertiary">Total Events:</span>
              <span className="text-content">{testResults.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">Success:</span>
              <span className="text-green-600">{successCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-600">Errors:</span>
              <span className="text-red-600">{errorCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-yellow-600">Pending:</span>
              <span className="text-yellow-600">{pendingCount}</span>
            </div>
          </div>
        )}

        {/* EventBus Metrics */}
        <div className="pt-3 border-t border-border mt-3 text-xs">
          <div className="text-tertiary mb-1">EventBus Metrics:</div>
          <div className="flex justify-between">
            <span className="text-tertiary">Events Received:</span>
            <span className="text-content">{metrics.eventsReceived}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-tertiary">Events Processed:</span>
            <span className="text-content">{metrics.eventsProcessed}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-tertiary">Errors:</span>
            <span className={`${metrics.errors > 0 ? 'text-red-500' : 'text-content'}`}>
              {metrics.errors}
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Results */}
      {testResults.length > 0 && (
        <div className="bg-surface border border-border rounded-lg shadow-lg p-3 max-h-64 overflow-y-auto">
          <div className="text-xs font-semibold text-content mb-2">Test Results:</div>
          <div className="space-y-1 text-xs">
            {testResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between py-1">
                <span className="text-tertiary truncate flex-1">{result.event}</span>
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      result.status === 'success'
                        ? 'bg-green-500'
                        : result.status === 'error'
                          ? 'bg-red-500'
                          : 'bg-yellow-500'
                    }`}
                  />
                  <span
                    className={`text-xs ${
                      result.status === 'success'
                        ? 'text-green-600'
                        : result.status === 'error'
                          ? 'text-red-600'
                          : 'text-yellow-600'
                    }`}
                  >
                    {result.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Export additional testing utilities
export function useEventFlowTesting() {
  const { emit, eventMetrics } = useEventBus();
  const [lastEmittedEvent, setLastEmittedEvent] = useState<string | null>(null);

  const emitTestEvent = useCallback(
    (channel: string, payload: any) => {
      try {
        emit(channel, payload);
        setLastEmittedEvent(channel);
        return true;
      } catch (error) {
        console.error('[EventFlowTesting] Error emitting event:', error);
        return false;
      }
    },
    [emit],
  );

  return {
    emitTestEvent,
    lastEmittedEvent,
    metrics: eventMetrics,
    clearLastEvent: () => setLastEmittedEvent(null),
  };
}
