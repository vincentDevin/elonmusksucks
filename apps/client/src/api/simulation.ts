import api from './axios';
import type { JsonRuleAchievementData } from '@ems/types';

interface SimulationEvent {
  eventKey: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

interface SimulationStep {
  eventIndex: number;
  event: SimulationEvent;
  progressBefore: number;
  progressAfter: number;
  counters: Record<string, number>;
  unlocked: boolean;
  details: string;
}

interface SimulationResult {
  finalProgress: number;
  finalCounters: Record<string, number>;
  unlocked: boolean;
  unlockedAt?: number;
  steps: SimulationStep[];
  executionTime: number;
  complexity: 'low' | 'medium' | 'high';
}

interface SimulateRuleRequest {
  rule: JsonRuleAchievementData;
  events?: SimulationEvent[];
  scenario?: 'success' | 'failure' | 'mixed';
  eventCount?: number;
}

interface SimulateRuleResponse {
  success: boolean;
  simulation: SimulationResult;
  generatedEvents: boolean;
}

interface GenerateTestEventsRequest {
  rule: JsonRuleAchievementData;
  scenario?: 'success' | 'failure' | 'mixed';
  eventCount?: number;
}

interface GenerateTestEventsResponse {
  success: boolean;
  events: SimulationEvent[];
  scenario: string;
  count: number;
}

interface QuickSimulateRequest {
  rule: JsonRuleAchievementData;
}

interface QuickSimulateResponse {
  success: boolean;
  scenarios: Record<'success' | 'failure' | 'mixed', SimulationResult & { eventCount: number }>;
  rule: {
    eventKeys: string[];
    progressType: string;
    complexity: 'low' | 'medium' | 'high';
  };
}

export async function simulateRule(request: SimulateRuleRequest): Promise<SimulationResult> {
  const response = await api.post<SimulateRuleResponse>(
    '/admin/achievements/rules/simulate',
    request,
  );
  return response.data.simulation;
}

export async function generateTestEvents(
  request: GenerateTestEventsRequest,
): Promise<SimulationEvent[]> {
  const response = await api.post<GenerateTestEventsResponse>(
    '/admin/achievements/rules/generate-test-events',
    request,
  );
  return response.data.events;
}

export async function quickSimulate(
  request: QuickSimulateRequest,
): Promise<QuickSimulateResponse['scenarios']> {
  const response = await api.post<QuickSimulateResponse>(
    '/admin/achievements/rules/quick-simulate',
    request,
  );
  return response.data.scenarios;
}
