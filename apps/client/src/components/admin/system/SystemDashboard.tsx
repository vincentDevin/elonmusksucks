// Integrated System Monitoring Dashboard
// Combines DatabaseMonitor and EventSystemMonitor for comprehensive system oversight

import React, { useState } from 'react';
import { ServerIcon, CircleStackIcon, BoltIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import DatabaseMonitor from './DatabaseMonitor';
import EventSystemMonitor from './EventSystemMonitor';

export default function SystemDashboard() {
  const [activeView, setActiveView] = useState<'overview' | 'database' | 'events'>('overview');

  const views = [
    {
      key: 'overview' as const,
      label: 'System Overview',
      icon: ServerIcon,
      description: 'Combined system health at a glance',
    },
    {
      key: 'database' as const,
      label: 'Database Monitor',
      icon: CircleStackIcon,
      description: 'PostgreSQL and Redis performance metrics',
    },
    {
      key: 'events' as const,
      label: 'Event System',
      icon: BoltIcon,
      description: 'Real-time event bus monitoring',
    },
  ];

  return (
    <div className="bg-surface rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">System Monitoring Dashboard</h1>
          <p className="text-tertiary text-sm">
            Comprehensive monitoring for database, Redis, and event system health
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <ChartBarIcon className="w-6 h-6 text-primary" />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {views.map((view) => (
            <button
              key={view.key}
              onClick={() => setActiveView(view.key)}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeView === view.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-tertiary hover:text-content hover:border-muted'
              }`}
            >
              <view.icon className="w-4 h-4" />
              <span>{view.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="min-h-[600px]">
        {activeView === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Database Status */}
              <div className="bg-background rounded-lg p-4 border border-border">
                <h3 className="text-lg font-semibold text-content mb-4 flex items-center gap-2">
                  <CircleStackIcon className="w-5 h-5 text-primary" />
                  Database Health
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-tertiary">PostgreSQL Status</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm font-medium">Connected</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-tertiary">Redis Status</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm font-medium">Connected</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => setActiveView('database')}
                      className="w-full text-center py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm"
                    >
                      View Database Details
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Event System Status */}
              <div className="bg-background rounded-lg p-4 border border-border">
                <h3 className="text-lg font-semibold text-content mb-4 flex items-center gap-2">
                  <BoltIcon className="w-5 h-5 text-primary" />
                  Event System Health
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-tertiary">System Status</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-sm font-medium">Healthy</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-tertiary">Event Processing</span>
                    <span className="text-sm font-medium">Active</span>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => setActiveView('events')}
                      className="w-full text-center py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm"
                    >
                      View Event System Details
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* System Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-background rounded-lg p-4 border border-border text-center">
                <div className="text-2xl font-bold text-green-600">99.9%</div>
                <div className="text-sm text-tertiary">System Uptime</div>
              </div>
              <div className="bg-background rounded-lg p-4 border border-border text-center">
                <div className="text-2xl font-bold text-blue-600">~45ms</div>
                <div className="text-sm text-tertiary">Avg Response Time</div>
              </div>
              <div className="bg-background rounded-lg p-4 border border-border text-center">
                <div className="text-2xl font-bold text-purple-600">0</div>
                <div className="text-sm text-tertiary">Active Alerts</div>
              </div>
              <div className="bg-background rounded-lg p-4 border border-border text-center">
                <div className="text-2xl font-bold text-orange-600">75+</div>
                <div className="text-sm text-tertiary">Monitored Events</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-background rounded-lg p-4 border border-border">
              <h3 className="text-lg font-semibold text-content mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveView('database')}
                  className="p-3 text-left bg-muted rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="font-medium text-content">Clear Query Metrics</div>
                  <div className="text-sm text-tertiary">Reset database performance history</div>
                </button>
                <button
                  onClick={() => setActiveView('events')}
                  className="p-3 text-left bg-muted rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="font-medium text-content">Reset Event Metrics</div>
                  <div className="text-sm text-tertiary">Clear event system monitoring data</div>
                </button>
                <button className="p-3 text-left bg-muted rounded-lg hover:bg-accent transition-colors">
                  <div className="font-medium text-content">Export System Report</div>
                  <div className="text-sm text-tertiary">Download comprehensive system metrics</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeView === 'database' && <DatabaseMonitor />}
        {activeView === 'events' && <EventSystemMonitor />}
      </div>
    </div>
  );
}
