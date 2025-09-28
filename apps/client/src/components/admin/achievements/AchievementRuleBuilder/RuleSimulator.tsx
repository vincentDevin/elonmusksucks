import React, { useState, useCallback } from 'react';
import type { JsonRuleAchievementData } from '@ems/types';
import { simulateRule, generateTestEvents, quickSimulate } from '../../../../api/simulation';

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

interface RuleSimulatorProps {
  rule: JsonRuleAchievementData;
  disabled?: boolean;
}

export const RuleSimulator: React.FC<RuleSimulatorProps> = ({ rule, disabled = false }) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [quickResults, setQuickResults] = useState<Record<
    string,
    SimulationResult & { eventCount: number }
  > | null>(null);
  const [customEvents, setCustomEvents] = useState<SimulationEvent[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<'success' | 'failure' | 'mixed'>(
    'mixed',
  );
  const [eventCount, setEventCount] = useState(50);
  const [activeTab, setActiveTab] = useState<'quick' | 'custom' | 'events'>('quick');

  const runQuickSimulation = useCallback(async () => {
    if (!rule.eventKeys?.length || disabled) return;

    setIsSimulating(true);
    try {
      const results = await quickSimulate({ rule });
      setQuickResults(results);
      setSimulationResult(null);
    } catch (error) {
      console.error('Quick simulation failed:', error);
    } finally {
      setIsSimulating(false);
    }
  }, [rule, disabled]);

  const runCustomSimulation = useCallback(async () => {
    if (!rule.eventKeys?.length || disabled) return;

    setIsSimulating(true);
    try {
      const result = await simulateRule({
        rule,
        events: customEvents.length > 0 ? customEvents : undefined,
        scenario: selectedScenario,
        eventCount,
      });
      setSimulationResult(result);
      setQuickResults(null);
    } catch (error) {
      console.error('Custom simulation failed:', error);
    } finally {
      setIsSimulating(false);
    }
  }, [rule, customEvents, selectedScenario, eventCount, disabled]);

  const generateEvents = useCallback(async () => {
    if (!rule.eventKeys?.length || disabled) return;

    setIsSimulating(true);
    try {
      const events = await generateTestEvents({
        rule,
        scenario: selectedScenario,
        eventCount,
      });
      setCustomEvents(events);
    } catch (error) {
      console.error('Event generation failed:', error);
    } finally {
      setIsSimulating(false);
    }
  }, [rule, selectedScenario, eventCount, disabled]);

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low':
        return 'text-success';
      case 'medium':
        return 'text-warning';
      case 'high':
        return 'text-error';
      default:
        return 'text-tertiary';
    }
  };

  const getComplexityIcon = (complexity: string) => {
    switch (complexity) {
      case 'low':
        return '🟢';
      case 'medium':
        return '🟡';
      case 'high':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const renderQuickResults = () => {
    if (!quickResults) return null;

    return (
      <div className="space-y-4">
        <h4 className="font-medium text-content">Scenario Comparison</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(quickResults).map(([scenario, result]) => (
            <div key={scenario} className="bg-surface border border-muted rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-content capitalize">{scenario}</h5>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm ${getComplexityColor(result.complexity)}`}>
                    {getComplexityIcon(result.complexity)} {result.complexity}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-tertiary">Progress:</span>
                  <span className="text-content font-mono">{result.finalProgress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-tertiary">Unlocked:</span>
                  <span className={result.unlocked ? 'text-success' : 'text-error'}>
                    {result.unlocked ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
                {result.unlocked && result.unlockedAt !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-tertiary">At Event:</span>
                    <span className="text-content font-mono">{result.unlockedAt + 1}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-tertiary">Events:</span>
                  <span className="text-content font-mono">{result.eventCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-tertiary">Time:</span>
                  <span className="text-content font-mono">
                    {formatDuration(result.executionTime)}
                  </span>
                </div>

                {Object.keys(result.finalCounters).length > 0 && (
                  <div className="pt-2 border-t border-muted">
                    <div className="text-xs text-tertiary mb-1">Counters:</div>
                    {Object.entries(result.finalCounters).map(([counter, value]) => (
                      <div key={counter} className="flex justify-between text-xs">
                        <span className="text-tertiary">{counter}:</span>
                        <span className="text-content font-mono">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCustomResult = () => {
    if (!simulationResult) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-content">Simulation Result</h4>
          <div className="flex items-center space-x-4 text-sm">
            <span className={`${getComplexityColor(simulationResult.complexity)}`}>
              {getComplexityIcon(simulationResult.complexity)} {simulationResult.complexity}{' '}
              complexity
            </span>
            <span className="text-tertiary">{formatDuration(simulationResult.executionTime)}</span>
          </div>
        </div>

        <div className="bg-surface border border-muted rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-mono text-primary">
                {simulationResult.finalProgress}
              </div>
              <div className="text-xs text-tertiary">Final Progress</div>
            </div>
            <div className="text-center">
              <div
                className={`text-2xl ${simulationResult.unlocked ? 'text-success' : 'text-error'}`}
              >
                {simulationResult.unlocked ? '✅' : '❌'}
              </div>
              <div className="text-xs text-tertiary">Unlocked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-mono text-content">{simulationResult.steps.length}</div>
              <div className="text-xs text-tertiary">Events Processed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-mono text-content">
                {simulationResult.unlockedAt !== undefined ? simulationResult.unlockedAt + 1 : '-'}
              </div>
              <div className="text-xs text-tertiary">Unlocked At Event</div>
            </div>
          </div>

          {Object.keys(simulationResult.finalCounters).length > 0 && (
            <div className="border-t border-muted pt-4">
              <h5 className="font-medium text-content mb-2">Final Counters</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {Object.entries(simulationResult.finalCounters).map(([counter, value]) => (
                  <div key={counter} className="flex justify-between bg-muted px-2 py-1 rounded">
                    <span className="text-tertiary">{counter}:</span>
                    <span className="text-content font-mono">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Simulation Steps */}
        <div className="bg-surface border border-muted rounded-lg p-4">
          <h5 className="font-medium text-content mb-3">Simulation Steps</h5>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {simulationResult.steps.map((step, index) => (
              <div
                key={index}
                className={`text-xs border rounded p-2 ${
                  step.unlocked && !simulationResult.steps[index - 1]?.unlocked
                    ? 'border-success bg-success/10'
                    : 'border-muted'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-tertiary">Event {step.eventIndex + 1}</span>
                  <span className="text-tertiary">{step.event.eventKey}</span>
                </div>
                <div className="flex items-center justify-between text-content">
                  <span>
                    {step.progressBefore} → {step.progressAfter}
                  </span>
                  {step.unlocked && <span className="text-success">🎉 Unlocked!</span>}
                </div>
                <div className="text-tertiary mt-1">{step.details}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (!rule.eventKeys?.length) {
    return (
      <div className="bg-muted rounded-lg p-6 text-center">
        <div className="text-tertiary mb-2">⚠️ No Event Keys Selected</div>
        <p className="text-sm text-tertiary">
          Select event keys in the rule builder to enable simulation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-content">Rule Simulator</h3>
        <div className="text-sm text-tertiary">
          Test your achievement rule against simulated events
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted rounded-lg p-1">
        {[
          { id: 'quick', label: 'Quick Test', icon: '⚡' },
          { id: 'custom', label: 'Custom Simulation', icon: '⚙️' },
          { id: 'events', label: 'Event Generator', icon: '🎲' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            disabled={disabled}
            className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-primary text-white' : 'text-tertiary hover:text-content'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'quick' && (
        <div className="space-y-4">
          <div className="bg-surface border border-muted rounded-lg p-4">
            <p className="text-sm text-tertiary mb-4">
              Run your rule against three different scenarios to see how it performs.
            </p>
            <button
              onClick={runQuickSimulation}
              disabled={disabled || isSimulating}
              className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSimulating ? 'Running Simulations...' : '⚡ Run Quick Test'}
            </button>
          </div>
          {renderQuickResults()}
        </div>
      )}

      {activeTab === 'custom' && (
        <div className="space-y-4">
          <div className="bg-surface border border-muted rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-content mb-2">Scenario Type</label>
                <select
                  value={selectedScenario}
                  onChange={(e) => setSelectedScenario(e.target.value as any)}
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-muted rounded-lg bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="mixed">Mixed (60% success rate)</option>
                  <option value="success">Success (high success rate)</option>
                  <option value="failure">Failure (low success rate)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-content mb-2">Event Count</label>
                <input
                  type="number"
                  value={eventCount}
                  onChange={(e) => setEventCount(Number(e.target.value))}
                  min={1}
                  max={1000}
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-muted rounded-lg bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
            <button
              onClick={runCustomSimulation}
              disabled={disabled || isSimulating}
              className="w-full px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSimulating ? 'Running Simulation...' : '⚙️ Run Custom Simulation'}
            </button>
          </div>
          {renderCustomResult()}
        </div>
      )}

      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="bg-surface border border-muted rounded-lg p-4 space-y-4">
            <p className="text-sm text-tertiary">
              Generate test events that you can use in custom simulations or export for testing.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-content mb-2">Scenario Type</label>
                <select
                  value={selectedScenario}
                  onChange={(e) => setSelectedScenario(e.target.value as any)}
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-muted rounded-lg bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="mixed">Mixed Events</option>
                  <option value="success">Success Events</option>
                  <option value="failure">Failure Events</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-content mb-2">
                  Number of Events
                </label>
                <input
                  type="number"
                  value={eventCount}
                  onChange={(e) => setEventCount(Number(e.target.value))}
                  min={1}
                  max={1000}
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-muted rounded-lg bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
            <button
              onClick={generateEvents}
              disabled={disabled || isSimulating}
              className="w-full px-4 py-2 bg-info text-white rounded-lg hover:bg-info/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSimulating ? 'Generating Events...' : '🎲 Generate Test Events'}
            </button>
          </div>

          {customEvents.length > 0 && (
            <div className="bg-surface border border-muted rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-content">
                  Generated Events ({customEvents.length})
                </h5>
                <button
                  onClick={() => setCustomEvents([])}
                  disabled={disabled}
                  className="text-sm text-error hover:text-error/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto text-xs">
                {customEvents.map((event, index) => (
                  <div key={index} className="bg-muted rounded p-2 font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-primary">{event.eventKey}</span>
                      <span className="text-tertiary">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-tertiary mt-1">
                      {JSON.stringify(event.payload, null, 0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
