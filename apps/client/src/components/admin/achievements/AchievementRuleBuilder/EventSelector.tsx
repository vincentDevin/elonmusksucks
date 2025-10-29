import React, { useState, useEffect } from 'react';
import { getEventKeyOptions } from '../../../../api/admin';
import type { EventKeyOption } from '@ems/types';

interface EventSelectorProps {
  selectedEvents: string[];
  onEventsChange: (events: string[]) => void;
  disabled?: boolean;
}

export const EventSelector: React.FC<EventSelectorProps> = ({
  selectedEvents,
  onEventsChange,
  disabled = false,
}) => {
  const [availableEvents, setAvailableEvents] = useState<EventKeyOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const events = await getEventKeyOptions();
        setAvailableEvents(events);
      } catch (error) {
        console.error('Failed to fetch event options:', error);
        // Fallback to basic event types
        setAvailableEvents([
          {
            key: 'bet:placed',
            description: 'Triggered when a user places a bet',
            category: 'betting',
            payloadSchema: { userId: 'number', amount: 'number' },
            volume: 'high',
          },
          {
            key: 'bet:won',
            description: 'Triggered when a user wins a bet',
            category: 'betting',
            payloadSchema: { userId: 'number', payout: 'number' },
            volume: 'medium',
          },
          {
            key: 'pong:match:completed',
            description: 'Triggered when a pong match completes',
            category: 'pong',
            payloadSchema: { result: 'string', score: 'object' },
            volume: 'low',
          },
          {
            key: 'chat:message:sent',
            description: 'Triggered when a user sends a chat message',
            category: 'chat',
            payloadSchema: { message: 'string', roomId: 'number' },
            volume: 'high',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const categories = Array.from(new Set(availableEvents.map((e) => e.category)));

  const filteredEvents = availableEvents.filter((event) => {
    const matchesSearch =
      event.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleEventToggle = (eventKey: string) => {
    if (disabled) return;

    const newEvents = selectedEvents.includes(eventKey)
      ? selectedEvents.filter((e) => e !== eventKey)
      : [...selectedEvents, eventKey];

    onEventsChange(newEvents);
  };

  const getVolumeColor = (volume: string) => {
    switch (volume) {
      case 'high':
        return 'text-error';
      case 'medium':
        return 'text-warning';
      case 'low':
        return 'text-success';
      default:
        return 'text-tertiary';
    }
  };

  const getVolumeIcon = (volume: string) => {
    switch (volume) {
      case 'high':
        return '⚡';
      case 'medium':
        return '📊';
      case 'low':
        return '📈';
      default:
        return '📋';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
        <span className="ml-2 text-tertiary">Loading events...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-muted rounded-lg bg-background text-content placeholder-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            disabled={disabled}
            className="px-3 py-2 border border-muted rounded-lg bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Events Summary */}
      {selectedEvents.length > 0 && (
        <div className="bg-primary/10 rounded-lg p-4">
          <h4 className="font-medium text-content mb-2">
            Selected Events ({selectedEvents.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedEvents.map((eventKey) => (
              <span
                key={eventKey}
                className="inline-flex items-center px-3 py-1 bg-primary text-white rounded-full text-sm"
              >
                {eventKey}
                {!disabled && (
                  <button
                    onClick={() => handleEventToggle(eventKey)}
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
            ))}
          </div>
        </div>
      )}

      {/* Available Events */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredEvents.map((event) => (
          <div
            key={event.key}
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              selectedEvents.includes(event.key)
                ? 'border-primary bg-primary/5'
                : 'border-muted hover:border-primary/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => handleEventToggle(event.key)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <code className="text-sm font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                    {event.key}
                  </code>
                  <span className={`text-xs ${getVolumeColor(event.volume)}`}>
                    {getVolumeIcon(event.volume)} {event.volume}
                  </span>
                </div>
                <p className="text-sm text-tertiary mt-1">{event.description}</p>

                {/* Payload Schema Preview */}
                <div className="mt-2">
                  <span className="text-xs text-tertiary">Payload: </span>
                  <code className="text-xs text-content">
                    {JSON.stringify(event.payloadSchema)}
                  </code>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-tertiary capitalize">{event.category}</span>
                {selectedEvents.includes(event.key) && (
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredEvents.length === 0 && (
          <div className="text-center py-8 text-tertiary">
            <p>No events found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};
