import React, { useState } from 'react';

interface CounterSelectorProps {
  selectedCounters: string[];
  onCountersChange: (counters: string[]) => void;
  disabled?: boolean;
}

const COMMON_COUNTERS = [
  {
    name: 'totalBets',
    description: 'Total number of bets placed',
    category: 'betting',
    type: 'count',
  },
  {
    name: 'totalWagered',
    description: 'Total amount wagered across all bets',
    category: 'betting',
    type: 'amount',
  },
  {
    name: 'netProfit',
    description: 'Net profit/loss from betting',
    category: 'betting',
    type: 'amount',
  },
  {
    name: 'winStreak',
    description: 'Current winning streak',
    category: 'betting',
    type: 'streak',
  },
  {
    name: 'bigWins',
    description: 'Number of wins above a threshold',
    category: 'betting',
    type: 'count',
  },
  {
    name: 'pongWins',
    description: 'Number of pong games won',
    category: 'pong',
    type: 'count',
  },
  {
    name: 'pongMatches',
    description: 'Total pong matches played',
    category: 'pong',
    type: 'count',
  },
  {
    name: 'messagesCount',
    description: 'Number of chat messages sent',
    category: 'chat',
    type: 'count',
  },
  {
    name: 'predictionsCreated',
    description: 'Number of predictions created',
    category: 'prediction',
    type: 'count',
  },
  {
    name: 'followersCount',
    description: 'Number of followers',
    category: 'social',
    type: 'count',
  },
  {
    name: 'loginDays',
    description: 'Number of days with login activity',
    category: 'user',
    type: 'count',
  },
  {
    name: 'uniqueCategories',
    description: 'Number of unique prediction categories participated in',
    category: 'prediction',
    type: 'count',
  },
];

export const CounterSelector: React.FC<CounterSelectorProps> = ({
  selectedCounters,
  onCountersChange,
  disabled = false,
}) => {
  const [customCounter, setCustomCounter] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = Array.from(new Set(COMMON_COUNTERS.map((c) => c.category)));

  const filteredCounters = COMMON_COUNTERS.filter(
    (counter) => selectedCategory === 'all' || counter.category === selectedCategory,
  );

  const handleCounterToggle = (counterName: string) => {
    if (disabled) return;

    const newCounters = selectedCounters.includes(counterName)
      ? selectedCounters.filter((c) => c !== counterName)
      : [...selectedCounters, counterName];

    onCountersChange(newCounters);
  };

  const handleAddCustomCounter = () => {
    if (!customCounter.trim() || disabled) return;

    const counterName = customCounter.trim();
    if (!selectedCounters.includes(counterName)) {
      onCountersChange([...selectedCounters, counterName]);
    }

    setCustomCounter('');
    setShowCustomInput(false);
  };

  const handleRemoveCounter = (counterName: string) => {
    if (disabled) return;
    onCountersChange(selectedCounters.filter((c) => c !== counterName));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'betting':
        return '🎰';
      case 'pong':
        return '🏓';
      case 'chat':
        return '💬';
      case 'prediction':
        return '🔮';
      case 'social':
        return '👥';
      case 'user':
        return '👤';
      default:
        return '📊';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'count':
        return 'text-primary';
      case 'amount':
        return 'text-success';
      case 'streak':
        return 'text-warning';
      default:
        return 'text-tertiary';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'count':
        return '🔢';
      case 'amount':
        return '💰';
      case 'streak':
        return '🔥';
      default:
        return '📈';
    }
  };

  return (
    <div className="space-y-4">
      {/* Selected Counters */}
      {selectedCounters.length > 0 && (
        <div className="bg-primary/10 rounded-lg p-4">
          <h4 className="font-medium text-content mb-3">
            Selected Counters ({selectedCounters.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedCounters.map((counterName) => {
              const counter = COMMON_COUNTERS.find((c) => c.name === counterName);
              return (
                <span
                  key={counterName}
                  className="inline-flex items-center px-3 py-1 bg-primary text-white rounded-full text-sm"
                >
                  {counter && <span className="mr-1">{getCategoryIcon(counter.category)}</span>}
                  {counterName}
                  {!disabled && (
                    <button
                      onClick={() => handleRemoveCounter(counterName)}
                      className="ml-2 hover:bg-primary-hover rounded-full p-0.5"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-content mb-2">Filter by Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            disabled={disabled}
            className="px-3 py-2 border border-muted rounded-lg bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {getCategoryIcon(category)} {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Add Custom Counter */}
        <div>
          {!showCustomInput ? (
            <button
              type="button"
              onClick={() => setShowCustomInput(true)}
              disabled={disabled}
              className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              + Add Custom Counter
            </button>
          ) : (
            <div className="flex space-x-2">
              <input
                type="text"
                value={customCounter}
                onChange={(e) => setCustomCounter(e.target.value)}
                placeholder="counterName"
                disabled={disabled}
                className="px-3 py-2 border border-muted rounded-lg bg-background text-content text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                onKeyPress={(e) => e.key === 'Enter' && handleAddCustomCounter()}
              />
              <button
                type="button"
                onClick={handleAddCustomCounter}
                disabled={disabled || !customCounter.trim()}
                className="px-3 py-2 bg-success text-white rounded-lg hover:bg-success/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomCounter('');
                }}
                disabled={disabled}
                className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Available Counters */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredCounters.map((counter) => (
          <div
            key={counter.name}
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              selectedCounters.includes(counter.name)
                ? 'border-primary bg-primary/5'
                : 'border-muted hover:border-primary/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => handleCounterToggle(counter.name)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getCategoryIcon(counter.category)}</span>
                  <code className="text-sm font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                    {counter.name}
                  </code>
                  <span
                    className={`text-xs flex items-center space-x-1 ${getTypeColor(counter.type)}`}
                  >
                    <span>{getTypeIcon(counter.type)}</span>
                    <span>{counter.type}</span>
                  </span>
                </div>
                <p className="text-sm text-tertiary mt-1">{counter.description}</p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-tertiary capitalize">{counter.category}</span>
                {selectedCounters.includes(counter.name) && (
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredCounters.length === 0 && (
          <div className="text-center py-8 text-tertiary">
            <p>No counters found for this category.</p>
          </div>
        )}
      </div>

      {/* Counter Usage Info */}
      <div className="bg-muted rounded-lg p-4">
        <h4 className="font-medium text-content mb-2">About Counters</h4>
        <div className="text-sm text-tertiary space-y-2">
          <p>
            Counters track additional metrics alongside the main progress. They're useful for
            complex achievements that need to consider multiple factors.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            <div className="flex items-center space-x-2">
              <span className="text-primary">🔢</span>
              <div>
                <div className="text-xs font-medium text-content">Count</div>
                <div className="text-xs">Simple counters</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-success">💰</span>
              <div>
                <div className="text-xs font-medium text-content">Amount</div>
                <div className="text-xs">Monetary values</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-warning">🔥</span>
              <div>
                <div className="text-xs font-medium text-content">Streak</div>
                <div className="text-xs">Consecutive actions</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
