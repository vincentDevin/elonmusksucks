import React from 'react';
import type { JsonRuleAchievementData, RuleValidationResult } from '@ems/types';

interface RulePreviewProps {
  rule: JsonRuleAchievementData;
  validation: RuleValidationResult;
}

export const RulePreview: React.FC<RulePreviewProps> = ({ rule, validation }) => {
  const generateRuleSummary = (): string => {
    if (!rule.eventKeys?.length) return 'No events selected';

    const eventText =
      rule.eventKeys.length === 1
        ? `"${rule.eventKeys[0]}" events`
        : `${rule.eventKeys.length} different event types`;

    const progressText = getProgressDescription(rule.progress);
    const unlockText = getUnlockDescription(rule.unlockWhen);

    return `${progressText} from ${eventText}. ${unlockText}`;
  };

  const getProgressDescription = (progress: JsonRuleAchievementData['progress']): string => {
    switch (progress.kind) {
      case 'count':
        return 'Count occurrences';
      case 'streak':
        return 'Track consecutive successes';
      case 'threshold':
        return 'Track cumulative value';
      case 'binary':
        return 'Check if condition occurs';
      default:
        return 'Track progress';
    }
  };

  const getUnlockDescription = (unlockWhen: Record<string, unknown>): string => {
    if (!unlockWhen || Object.keys(unlockWhen).length === 0) {
      return 'No unlock conditions set';
    }

    const conditions = Object.entries(unlockWhen);
    const [key, value] = conditions[0];

    if (key.includes('progress')) {
      const operator = key.replace('progress ', '').trim();
      return `Unlocks when progress ${operator} ${value}`;
    }

    return `Unlocks when ${key} ${value}`;
  };

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

  return (
    <div className="space-y-4">
      {/* Rule Summary */}
      <div className="bg-muted rounded-lg p-4">
        <h4 className="font-medium text-content mb-2">Human-Readable Summary</h4>
        <p className="text-sm text-content">{generateRuleSummary()}</p>
      </div>

      {/* Validation Status */}
      <div
        className={`rounded-lg p-4 border-l-4 ${
          validation.isValid ? 'bg-success/10 border-l-success' : 'bg-error/10 border-l-error'
        }`}
      >
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-lg">{validation.isValid ? '✅' : '❌'}</span>
          <h4 className="font-medium text-content">
            Validation Status: {validation.isValid ? 'Valid' : 'Invalid'}
          </h4>
        </div>

        {validation.errors.length > 0 && (
          <div className="mb-2">
            <h5 className="text-sm font-medium text-error mb-1">Errors:</h5>
            <ul className="text-sm text-error space-y-1">
              {validation.errors.map((error, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span>•</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {validation.warnings.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-warning mb-1">Warnings:</h5>
            <ul className="text-sm text-warning space-y-1">
              {validation.warnings.map((warning, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span>•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Rule Complexity */}
      <div className="bg-muted rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-content">Rule Complexity</h4>
          <div className="flex items-center space-x-2">
            <span>{getComplexityIcon(validation.estimatedComplexity)}</span>
            <span
              className={`text-sm font-medium capitalize ${getComplexityColor(validation.estimatedComplexity)}`}
            >
              {validation.estimatedComplexity}
            </span>
          </div>
        </div>
        <p className="text-sm text-tertiary">
          {validation.estimatedComplexity === 'low' &&
            'This rule is simple and will process quickly.'}
          {validation.estimatedComplexity === 'medium' &&
            'This rule has moderate complexity and should perform well.'}
          {validation.estimatedComplexity === 'high' &&
            'This rule is complex and may impact performance. Consider simplifying.'}
        </p>
      </div>

      {/* JSON Preview */}
      <div className="bg-muted rounded-lg p-4">
        <h4 className="font-medium text-content mb-2">JSON Rule Data</h4>
        <div className="bg-background rounded border p-3">
          <pre className="text-xs text-content font-mono overflow-x-auto">
            {JSON.stringify(rule, null, 2)}
          </pre>
        </div>
      </div>

      {/* Event Details */}
      {rule.eventKeys && rule.eventKeys.length > 0 && (
        <div className="bg-muted rounded-lg p-4">
          <h4 className="font-medium text-content mb-2">Event Keys</h4>
          <div className="flex flex-wrap gap-2">
            {rule.eventKeys.map((eventKey) => (
              <span
                key={eventKey}
                className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium"
              >
                {eventKey}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Progress Configuration */}
      <div className="bg-muted rounded-lg p-4">
        <h4 className="font-medium text-content mb-2">Progress Configuration</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-tertiary">Type:</span>
            <span className="text-content font-medium capitalize">{rule.progress.kind}</span>
          </div>

          {rule.progress.incrementIf && (
            <div className="flex justify-between">
              <span className="text-tertiary">Increment When:</span>
              <span className="text-content text-xs font-mono">
                {JSON.stringify(rule.progress.incrementIf)}
              </span>
            </div>
          )}

          {rule.progress.setIf && (
            <div className="flex justify-between">
              <span className="text-tertiary">Set When:</span>
              <span className="text-content text-xs font-mono">
                {JSON.stringify(rule.progress.setIf)}
              </span>
            </div>
          )}

          {rule.progress.resetIf && (
            <div className="flex justify-between">
              <span className="text-tertiary">Reset When:</span>
              <span className="text-content text-xs font-mono">
                {JSON.stringify(rule.progress.resetIf)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Additional Counters */}
      {rule.counters && rule.counters.length > 0 && (
        <div className="bg-muted rounded-lg p-4">
          <h4 className="font-medium text-content mb-2">Additional Counters</h4>
          <div className="flex flex-wrap gap-2">
            {rule.counters.map((counter) => (
              <span
                key={counter}
                className="px-3 py-1 bg-secondary/20 text-secondary rounded-full text-sm font-medium"
              >
                {counter}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
