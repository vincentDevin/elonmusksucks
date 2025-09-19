import React, { useState } from 'react';
import { VisualConditionBuilder } from './VisualConditionBuilder';

interface ConditionBuilderProps {
  type: 'incrementIf' | 'setIf' | 'resetIf';
  label: string;
  description: string;
  condition?: Record<string, unknown>;
  onConditionChange: (condition?: Record<string, unknown>) => void;
  disabled?: boolean;
  required?: boolean;
}

export const ConditionBuilder: React.FC<ConditionBuilderProps> = ({
  type,
  label,
  description,
  condition,
  onConditionChange,
  disabled = false,
  required = false,
}) => {
  const [isEnabled, setIsEnabled] = useState(!!condition && Object.keys(condition).length > 0);
  const [conditionText, setConditionText] = useState(() => {
    return condition ? JSON.stringify(condition, null, 2) : '';
  });
  const [useVisualBuilder, setUseVisualBuilder] = useState(false);

  const handleToggle = () => {
    if (disabled) return;

    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);

    if (!newEnabled) {
      onConditionChange(undefined);
      setConditionText('');
    } else {
      // Set a default condition based on type
      const defaultCondition = getDefaultCondition(type);
      onConditionChange(defaultCondition);
      setConditionText(JSON.stringify(defaultCondition, null, 2));
    }
  };

  const getDefaultCondition = (conditionType: string): Record<string, unknown> => {
    switch (conditionType) {
      case 'incrementIf':
        return { won: true };
      case 'resetIf':
        return { won: false };
      case 'setIf':
        return { 'amount >=': 100 };
      default:
        return {};
    }
  };

  const handleConditionTextChange = (text: string) => {
    setConditionText(text);

    if (!text.trim()) {
      onConditionChange(undefined);
      return;
    }

    try {
      const parsed = JSON.parse(text);
      onConditionChange(parsed);
    } catch (error) {
      // Invalid JSON, don't update the condition yet
      console.warn('Invalid JSON condition:', error);
    }
  };

  const getExampleConditions = () => {
    switch (type) {
      case 'incrementIf':
        return [
          '{ "won": true }',
          '{ "result": "win" }',
          '{ "amount >=": 50 }',
          '{ "and": [{ "won": true }, { "amount >=": 100 }] }',
        ];
      case 'resetIf':
        return ['{ "won": false }', '{ "result": "loss" }', '{ "streak_broken": true }'];
      case 'setIf':
        return [
          '{ "netProfit": "$.netProfit" }',
          '{ "totalAmount": "$.totalAmount" }',
          '{ "winRate": "$.winRate" }',
        ];
      default:
        return [];
    }
  };

  const getAvailableFields = () => {
    switch (type) {
      case 'incrementIf':
      case 'resetIf':
        return [
          { name: 'won', type: 'boolean', description: 'Whether the user won' },
          { name: 'result', type: 'string', description: 'Result of the action (win/loss/draw)' },
          { name: 'amount', type: 'number', description: 'Monetary amount involved' },
          { name: 'score', type: 'number', description: 'Score achieved' },
          { name: 'category', type: 'string', description: 'Category of the event' },
          { name: 'userId', type: 'number', description: 'User ID' },
          { name: 'streak_broken', type: 'boolean', description: 'Whether a streak was broken' },
          { name: 'difficulty', type: 'string', description: 'Difficulty level' },
        ];
      case 'setIf':
        return [
          { name: 'netProfit', type: 'number', description: 'Net profit amount' },
          { name: 'totalAmount', type: 'number', description: 'Total amount' },
          { name: 'winRate', type: 'number', description: 'Win rate percentage' },
          { name: 'totalBets', type: 'number', description: 'Total number of bets' },
          { name: 'biggestWin', type: 'number', description: 'Largest single win' },
          { name: 'streak', type: 'number', description: 'Current streak count' },
        ];
      default:
        return [];
    }
  };

  const handleVisualConditionChange = (newCondition: Record<string, unknown>) => {
    onConditionChange(newCondition);
    setConditionText(JSON.stringify(newCondition, null, 2));
  };

  return (
    <div className="border border-border rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h4 className="font-medium text-content">{label}</h4>
            {required && (
              <span className="text-xs text-error bg-error/10 px-2 py-1 rounded">Required</span>
            )}
          </div>
          <p className="text-sm text-tertiary mt-1">{description}</p>
        </div>

        {!required && (
          <button
            type="button"
            onClick={handleToggle}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              isEnabled ? 'bg-primary' : 'bg-gray-200'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        )}
      </div>

      {/* Condition Editor */}
      {(isEnabled || required) && (
        <div className="space-y-3">
          {/* Builder Mode Toggle */}
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-content">
              Condition Configuration
            </label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setUseVisualBuilder(false)}
                disabled={disabled}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  !useVisualBuilder
                    ? 'bg-primary text-white'
                    : 'bg-muted text-tertiary hover:text-content'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                JSON Editor
              </button>
              <button
                type="button"
                onClick={() => setUseVisualBuilder(true)}
                disabled={disabled}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  useVisualBuilder
                    ? 'bg-primary text-white'
                    : 'bg-muted text-tertiary hover:text-content'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                Visual Builder
              </button>
            </div>
          </div>

          {useVisualBuilder ? (
            /* Visual Builder */
            <VisualConditionBuilder
              condition={condition}
              onConditionChange={handleVisualConditionChange}
              availableFields={getAvailableFields()}
              disabled={disabled}
            />
          ) : (
            /* JSON Editor */
            <div>
              <textarea
                value={conditionText}
                onChange={(e) => handleConditionTextChange(e.target.value)}
                disabled={disabled}
                placeholder={`Enter condition in JSON format, e.g.:\n${getDefaultCondition(type) ? JSON.stringify(getDefaultCondition(type), null, 2) : '{}'}`}
                className="w-full h-32 px-3 py-2 border border-border rounded-lg bg-background text-content font-mono text-sm placeholder-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              />
            </div>
          )}
          {!useVisualBuilder && (
            <>
              {/* JSON Validation */}
              {conditionText && (
                <div className="text-xs">
                  {(() => {
                    try {
                      JSON.parse(conditionText);
                      return (
                        <div className="flex items-center space-x-1 text-success">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>Valid JSON</span>
                        </div>
                      );
                    } catch (error) {
                      return (
                        <div className="flex items-center space-x-1 text-error">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>Invalid JSON: {(error as Error).message}</span>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}

              {/* Example Conditions - Only show in JSON mode */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-content">Example Conditions:</h5>
                <div className="flex flex-wrap gap-2">
                  {getExampleConditions().map((example, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleConditionTextChange(example)}
                      disabled={disabled}
                      className="text-xs bg-muted hover:bg-muted/80 text-content px-2 py-1 rounded font-mono disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {/* Field Reference Help - Only show in JSON mode */}
          {!useVisualBuilder && (
            <div className="bg-muted rounded-lg p-3 text-sm">
              <h5 className="font-medium text-content mb-2">Field References:</h5>
              <div className="space-y-1 text-tertiary text-xs">
                <div>
                  <code>won</code> - Boolean indicating if the user won
                </div>
                <div>
                  <code>result</code> - String result ("win", "loss", etc.)
                </div>
                <div>
                  <code>amount</code> - Numeric amount value
                </div>
                <div>
                  <code>amount &gt;=</code> - Greater than or equal comparison
                </div>
                <div>
                  <code>$.fieldName</code> - Dynamic reference to event payload field
                </div>
                <div>
                  <code>and</code> - Logical AND operation with array of conditions
                </div>
                <div>
                  <code>or</code> - Logical OR operation with array of conditions
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
