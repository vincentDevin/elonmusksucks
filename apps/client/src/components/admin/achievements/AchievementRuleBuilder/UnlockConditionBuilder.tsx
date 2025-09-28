import React, { useState } from 'react';

interface UnlockConditionBuilderProps {
  condition: Record<string, unknown>;
  onConditionChange: (condition: Record<string, unknown>) => void;
  disabled?: boolean;
}

const OPERATORS = [
  { value: '>=', label: 'Greater than or equal to (>=)', example: 'progress >= 10' },
  { value: '<=', label: 'Less than or equal to (<=)', example: 'progress <= 100' },
  { value: '==', label: 'Equal to (==)', example: 'progress == 1' },
  { value: '>', label: 'Greater than (>)', example: 'progress > 5' },
  { value: '<', label: 'Less than (<)', example: 'progress < 50' },
  { value: '!=', label: 'Not equal to (!=)', example: 'progress != 0' },
];

const CONDITION_TYPES = [
  { value: 'progress', label: 'Progress Value', description: 'Based on the main progress counter' },
  { value: 'counter', label: 'Custom Counter', description: 'Based on additional counters' },
  { value: 'complex', label: 'Complex Condition', description: 'Advanced JSON condition' },
];

export const UnlockConditionBuilder: React.FC<UnlockConditionBuilderProps> = ({
  condition,
  onConditionChange,
  disabled = false,
}) => {
  const [conditionType, setConditionType] = useState(() => {
    // Determine current condition type
    const keys = Object.keys(condition);
    if (keys.some((key) => key.startsWith('progress'))) return 'progress';
    if (keys.some((key) => key.startsWith('counter'))) return 'counter';
    if (keys.length > 0) return 'complex';
    return 'progress';
  });

  const [progressOperator, setProgressOperator] = useState(() => {
    const progressKey = Object.keys(condition).find((key) => key.startsWith('progress'));
    if (progressKey) {
      return progressKey.replace('progress ', '').trim() || '>=';
    }
    return '>=';
  });

  const [progressValue, setProgressValue] = useState(() => {
    const progressKey = Object.keys(condition).find((key) => key.startsWith('progress'));
    if (progressKey) {
      return String(condition[progressKey] || 10);
    }
    return '10';
  });

  const [counterName, setCounterName] = useState(() => {
    const counterKey = Object.keys(condition).find((key) => key.startsWith('counter'));
    if (counterKey) {
      const value = condition[counterKey];
      if (typeof value === 'object' && value && 'key' in value) {
        return String((value as any).key || 'totalBets');
      }
    }
    return 'totalBets';
  });

  const [counterOperator, setCounterOperator] = useState('>=');
  const [counterValue, setCounterValue] = useState('5');

  const [complexConditionText, setComplexConditionText] = useState(() => {
    if (conditionType === 'complex') {
      return JSON.stringify(condition, null, 2);
    }
    return '';
  });

  const handleConditionTypeChange = (newType: string) => {
    setConditionType(newType);
    updateCondition(newType);
  };

  const updateCondition = (type: string = conditionType) => {
    let newCondition: Record<string, unknown> = {};

    switch (type) {
      case 'progress':
        newCondition = {
          [`progress ${progressOperator}`]: parseInt(progressValue) || 10,
        };
        break;

      case 'counter':
        newCondition = {
          [`counter ${counterOperator}`]: {
            key: counterName,
            value: parseInt(counterValue) || 5,
          },
        };
        break;

      case 'complex':
        try {
          newCondition = complexConditionText ? JSON.parse(complexConditionText) : {};
        } catch (error) {
          // Keep current condition if JSON is invalid
          return;
        }
        break;
    }

    onConditionChange(newCondition);
  };

  const handleProgressChange = () => {
    if (conditionType === 'progress') {
      updateCondition();
    }
  };

  const handleCounterChange = () => {
    if (conditionType === 'counter') {
      updateCondition();
    }
  };

  const handleComplexConditionChange = (text: string) => {
    setComplexConditionText(text);
    if (conditionType === 'complex') {
      try {
        const parsed = JSON.parse(text);
        onConditionChange(parsed);
      } catch (error) {
        // Don't update if JSON is invalid
      }
    }
  };

  React.useEffect(() => {
    handleProgressChange();
  }, [progressOperator, progressValue]);

  React.useEffect(() => {
    handleCounterChange();
  }, [counterName, counterOperator, counterValue]);

  return (
    <div className="space-y-4">
      {/* Condition Type Selector */}
      <div>
        <label className="block text-sm font-medium text-content mb-2">Unlock Condition Type</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {CONDITION_TYPES.map((type) => (
            <div
              key={type.value}
              className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                conditionType === type.value
                  ? 'border-primary bg-primary/5'
                  : 'border-muted hover:border-primary/50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !disabled && handleConditionTypeChange(type.value)}
            >
              <div className="flex items-center space-x-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    conditionType === type.value ? 'bg-primary' : 'bg-muted'
                  }`}
                ></div>
                <h4 className="font-medium text-content">{type.label}</h4>
              </div>
              <p className="text-sm text-tertiary mt-1">{type.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Condition */}
      {conditionType === 'progress' && (
        <div className="bg-muted rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-content">Progress Condition</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-content mb-2">Operator</label>
              <select
                value={progressOperator}
                onChange={(e) => setProgressOperator(e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 border border-muted rounded-lg bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-content mb-2">Value</label>
              <input
                type="number"
                value={progressValue}
                onChange={(e) => setProgressValue(e.target.value)}
                disabled={disabled}
                min="0"
                className="w-full px-3 py-2 border border-muted rounded-lg bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
          <div className="text-sm text-tertiary">
            <strong>Preview:</strong>{' '}
            <code>
              progress {progressOperator} {progressValue}
            </code>
          </div>
        </div>
      )}

      {/* Counter Condition */}
      {conditionType === 'counter' && (
        <div className="bg-muted rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-content">Counter Condition</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-content mb-2">Counter Name</label>
              <input
                type="text"
                value={counterName}
                onChange={(e) => setCounterName(e.target.value)}
                disabled={disabled}
                placeholder="e.g., totalBets"
                className="w-full px-3 py-2 border border-muted rounded-lg bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-content mb-2">Operator</label>
              <select
                value={counterOperator}
                onChange={(e) => setCounterOperator(e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 border border-muted rounded-lg bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-content mb-2">Value</label>
              <input
                type="number"
                value={counterValue}
                onChange={(e) => setCounterValue(e.target.value)}
                disabled={disabled}
                min="0"
                className="w-full px-3 py-2 border border-muted rounded-lg bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
          <div className="text-sm text-tertiary">
            <strong>Preview:</strong>{' '}
            <code>
              counter {counterOperator}{' '}
              {JSON.stringify({ key: counterName, value: parseInt(counterValue) })}
            </code>
          </div>
        </div>
      )}

      {/* Complex Condition */}
      {conditionType === 'complex' && (
        <div className="bg-muted rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-content">Complex JSON Condition</h4>
          <div>
            <textarea
              value={complexConditionText}
              onChange={(e) => handleComplexConditionChange(e.target.value)}
              disabled={disabled}
              placeholder={`Enter unlock condition in JSON format, e.g.:\n{\n  "and": [\n    { "progress >=": 10 },\n    { "counter >=": { "key": "totalBets", "value": 5 } }\n  ]\n}`}
              className="w-full h-32 px-3 py-2 border border-muted rounded-lg bg-background text-content font-mono text-sm placeholder-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
          </div>

          {/* JSON Validation */}
          {complexConditionText && (
            <div className="text-xs">
              {(() => {
                try {
                  JSON.parse(complexConditionText);
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

          {/* Example Complex Conditions */}
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-content">Example Complex Conditions:</h5>
            <div className="space-y-1">
              {[
                '{ "and": [{ "progress >=": 10 }, { "counter >=": { "key": "totalBets", "value": 5 } }] }',
                '{ "or": [{ "progress >=": 100 }, { "counter >=": { "key": "bigWins", "value": 1 } }] }',
                '{ "progress >=": 1, "counter <=": { "key": "losses", "value": 0 } }',
              ].map((example, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleComplexConditionChange(example)}
                  disabled={disabled}
                  className="block w-full text-left text-xs bg-background hover:bg-muted text-content p-2 rounded font-mono disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-muted"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Current Condition Preview */}
      <div className="bg-primary/10 rounded-lg p-4">
        <h4 className="font-medium text-content mb-2">Current Unlock Condition</h4>
        <code className="text-sm text-content bg-background p-2 rounded block overflow-x-auto">
          {JSON.stringify(condition, null, 2)}
        </code>
      </div>
    </div>
  );
};
