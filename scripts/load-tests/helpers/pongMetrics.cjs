#!/usr/bin/env node
// scripts/load-tests/helpers/pongMetrics.cjs
// Metrics collection and analysis for pong load tests

/**
 * Metrics collector for pong load tests
 * Tracks connections, latency, game state updates, and errors
 */
class PongMetricsCollector {
  constructor() {
    this.reset();
  }

  reset() {
    this.startTime = Date.now();
    this.connections = {
      attempted: 0,
      successful: 0,
      failed: 0,
      durations: [],
    };
    this.authentication = {
      attempted: 0,
      successful: 0,
      failed: 0,
      durations: [],
    };
    this.matchOperations = {
      created: 0,
      joined: 0,
      failed: 0,
      durations: [],
    };
    this.gameStates = {
      received: 0,
      intervals: [], // Time between updates
      lastUpdateTime: null,
    };
    this.pings = [];
    this.errors = [];
    this.disconnections = {
      intentional: 0,
      unexpected: 0,
    };
    this.reconnections = {
      attempted: 0,
      successful: 0,
      failed: 0,
      durations: [],
    };
  }

  // Connection tracking
  recordConnectionAttempt() {
    this.connections.attempted++;
  }

  recordConnectionSuccess(duration) {
    this.connections.successful++;
    this.connections.durations.push(duration);
  }

  recordConnectionFailure() {
    this.connections.failed++;
  }

  // Authentication tracking
  recordAuthAttempt() {
    this.authentication.attempted++;
  }

  recordAuthSuccess(duration) {
    this.authentication.successful++;
    this.authentication.durations.push(duration);
  }

  recordAuthFailure() {
    this.authentication.failed++;
  }

  // Match operations
  recordMatchOperation(type, duration, success = true) {
    if (success) {
      if (type === 'create') this.matchOperations.created++;
      if (type === 'join') this.matchOperations.joined++;
      this.matchOperations.durations.push(duration);
    } else {
      this.matchOperations.failed++;
    }
  }

  // Game state updates
  recordGameState() {
    this.gameStates.received++;
    const now = Date.now();
    if (this.gameStates.lastUpdateTime) {
      const interval = now - this.gameStates.lastUpdateTime;
      this.gameStates.intervals.push(interval);
    }
    this.gameStates.lastUpdateTime = now;
  }

  // Ping measurements
  recordPing(pingMs) {
    this.pings.push(pingMs);
  }

  // Error tracking
  recordError(error) {
    this.errors.push({
      message: error.message || String(error),
      timestamp: Date.now(),
      code: error.code,
    });
  }

  // Disconnection tracking
  recordDisconnection(intentional = true) {
    if (intentional) {
      this.disconnections.intentional++;
    } else {
      this.disconnections.unexpected++;
    }
  }

  // Reconnection tracking
  recordReconnectionAttempt() {
    this.reconnections.attempted++;
  }

  recordReconnectionSuccess(duration) {
    this.reconnections.successful++;
    this.reconnections.durations.push(duration);
  }

  recordReconnectionFailure() {
    this.reconnections.failed++;
  }

  // Statistical calculations
  calculateStats(values) {
    if (values.length === 0) {
      return {
        min: 0,
        max: 0,
        avg: 0,
        median: 0,
        p95: 0,
        p99: 0,
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  // Generate comprehensive report
  getReport() {
    const duration = Date.now() - this.startTime;

    return {
      testDuration: duration,
      connections: {
        attempted: this.connections.attempted,
        successful: this.connections.successful,
        failed: this.connections.failed,
        successRate:
          this.connections.attempted > 0
            ? (this.connections.successful / this.connections.attempted) * 100
            : 0,
        latency: this.calculateStats(this.connections.durations),
      },
      authentication: {
        attempted: this.authentication.attempted,
        successful: this.authentication.successful,
        failed: this.authentication.failed,
        successRate:
          this.authentication.attempted > 0
            ? (this.authentication.successful / this.authentication.attempted) * 100
            : 0,
        latency: this.calculateStats(this.authentication.durations),
      },
      matchOperations: {
        created: this.matchOperations.created,
        joined: this.matchOperations.joined,
        failed: this.matchOperations.failed,
        total: this.matchOperations.created + this.matchOperations.joined,
        successRate:
          this.matchOperations.created + this.matchOperations.joined + this.matchOperations.failed >
          0
            ? ((this.matchOperations.created + this.matchOperations.joined) /
                (this.matchOperations.created +
                  this.matchOperations.joined +
                  this.matchOperations.failed)) *
              100
            : 0,
        latency: this.calculateStats(this.matchOperations.durations),
      },
      gameStateUpdates: {
        received: this.gameStates.received,
        frequency:
          this.gameStates.intervals.length > 0
            ? this.calculateStats(this.gameStates.intervals)
            : null,
        targetFrequency: {
          active: 120, // Hz
          waiting: 60, // Hz
        },
      },
      ping: this.pings.length > 0 ? this.calculateStats(this.pings) : null,
      disconnections: {
        intentional: this.disconnections.intentional,
        unexpected: this.disconnections.unexpected,
        total: this.disconnections.intentional + this.disconnections.unexpected,
      },
      reconnections: {
        attempted: this.reconnections.attempted,
        successful: this.reconnections.successful,
        failed: this.reconnections.failed,
        successRate:
          this.reconnections.attempted > 0
            ? (this.reconnections.successful / this.reconnections.attempted) * 100
            : 0,
        latency:
          this.reconnections.durations.length > 0
            ? this.calculateStats(this.reconnections.durations)
            : null,
      },
      errors: {
        total: this.errors.length,
        recent: this.errors.slice(-10), // Last 10 errors
      },
    };
  }

  // Format report for console output
  formatReport(report) {
    const lines = [];

    lines.push('\n╔════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                        PONG METRICS REPORT                             ║');
    lines.push('╚════════════════════════════════════════════════════════════════════════╝\n');

    lines.push(`  Test Duration: ${(report.testDuration / 1000).toFixed(2)}s\n`);

    // Connections
    lines.push('📡 CONNECTIONS:');
    lines.push(`  Attempted:    ${report.connections.attempted}`);
    lines.push(`  Successful:   ${report.connections.successful}`);
    lines.push(`  Failed:       ${report.connections.failed}`);
    lines.push(
      `  Success Rate: ${report.connections.successRate.toFixed(1)}% ${report.connections.successRate >= 95 ? '✅' : '⚠️'}`,
    );
    if (report.connections.latency.avg > 0) {
      lines.push(
        `  Latency:      avg ${report.connections.latency.avg.toFixed(0)}ms, p95 ${report.connections.latency.p95.toFixed(0)}ms`,
      );
    }
    lines.push('');

    // Authentication
    lines.push('🔐 AUTHENTICATION:');
    lines.push(`  Attempted:    ${report.authentication.attempted}`);
    lines.push(`  Successful:   ${report.authentication.successful}`);
    lines.push(`  Failed:       ${report.authentication.failed}`);
    lines.push(
      `  Success Rate: ${report.authentication.successRate.toFixed(1)}% ${report.authentication.successRate >= 95 ? '✅' : '⚠️'}`,
    );
    if (report.authentication.latency.avg > 0) {
      lines.push(
        `  Latency:      avg ${report.authentication.latency.avg.toFixed(0)}ms, p95 ${report.authentication.latency.p95.toFixed(0)}ms`,
      );
    }
    lines.push('');

    // Match Operations
    lines.push('🎮 MATCH OPERATIONS:');
    lines.push(`  Created:      ${report.matchOperations.created}`);
    lines.push(`  Joined:       ${report.matchOperations.joined}`);
    lines.push(`  Failed:       ${report.matchOperations.failed}`);
    lines.push(
      `  Success Rate: ${report.matchOperations.successRate.toFixed(1)}% ${report.matchOperations.successRate >= 95 ? '✅' : '⚠️'}`,
    );
    if (report.matchOperations.latency.avg > 0) {
      lines.push(
        `  Latency:      avg ${report.matchOperations.latency.avg.toFixed(0)}ms, p95 ${report.matchOperations.latency.p95.toFixed(0)}ms ${report.matchOperations.latency.p95 < 1000 ? '✅' : '⚠️'}`,
      );
    }
    lines.push('');

    // Game State Updates
    if (report.gameStateUpdates.received > 0) {
      lines.push('📊 GAME STATE UPDATES:');
      lines.push(`  Received:     ${report.gameStateUpdates.received}`);
      if (report.gameStateUpdates.frequency) {
        const avgFreq = 1000 / report.gameStateUpdates.frequency.avg; // Convert interval to Hz
        lines.push(`  Avg Frequency: ${avgFreq.toFixed(1)} Hz`);
        lines.push(
          `  Target:       120 Hz (active), 60 Hz (waiting) ${avgFreq >= 50 ? '✅' : '⚠️'}`,
        );
      }
      lines.push('');
    }

    // Ping
    if (report.ping) {
      lines.push('🏓 PING:');
      lines.push(
        `  Avg: ${report.ping.avg.toFixed(0)}ms, p95: ${report.ping.p95.toFixed(0)}ms ${report.ping.avg < 100 ? '✅' : '⚠️'}`,
      );
      lines.push('');
    }

    // Disconnections
    if (report.disconnections.total > 0) {
      lines.push('🔌 DISCONNECTIONS:');
      lines.push(`  Intentional:  ${report.disconnections.intentional}`);
      lines.push(
        `  Unexpected:   ${report.disconnections.unexpected} ${report.disconnections.unexpected === 0 ? '✅' : '⚠️'}`,
      );
      lines.push('');
    }

    // Reconnections
    if (report.reconnections.attempted > 0) {
      lines.push('🔄 RECONNECTIONS:');
      lines.push(`  Attempted:    ${report.reconnections.attempted}`);
      lines.push(`  Successful:   ${report.reconnections.successful}`);
      lines.push(`  Failed:       ${report.reconnections.failed}`);
      lines.push(
        `  Success Rate: ${report.reconnections.successRate.toFixed(1)}% ${report.reconnections.successRate >= 95 ? '✅' : '⚠️'}`,
      );
      lines.push('');
    }

    // Errors
    if (report.errors.total > 0) {
      lines.push(`❌ ERRORS: ${report.errors.total} total`);
      if (report.errors.recent.length > 0) {
        lines.push('  Recent errors:');
        report.errors.recent.forEach((error, idx) => {
          lines.push(`    ${idx + 1}. ${error.message}`);
        });
      }
      lines.push('');
    }

    lines.push('═'.repeat(72) + '\n');

    return lines.join('\n');
  }

  // Print report to console
  printReport() {
    const report = this.getReport();
    console.log(this.formatReport(report));
    return report;
  }
}

/**
 * Helper function to track socket connection lifecycle
 * @param {Socket} socket - Socket.IO socket
 * @param {PongMetricsCollector} metrics - Metrics collector
 * @returns {Function} Cleanup function
 */
function trackSocketMetrics(socket, metrics) {
  const connectionStart = Date.now();
  let authenticated = false;

  // Track connection
  metrics.recordConnectionAttempt();

  const onConnect = () => {
    metrics.recordConnectionSuccess(Date.now() - connectionStart);
  };

  const onAuthResult = (data) => {
    if (data.success) {
      authenticated = true;
      metrics.recordAuthSuccess(Date.now() - connectionStart);
    } else {
      metrics.recordAuthFailure();
    }
  };

  const onConnectError = () => {
    if (!authenticated) {
      metrics.recordConnectionFailure();
    }
  };

  const onDisconnect = (reason) => {
    const intentional = reason === 'io client disconnect';
    metrics.recordDisconnection(intentional);
  };

  const onError = (error) => {
    metrics.recordError(error);
  };

  const onGameState = () => {
    metrics.recordGameState();
  };

  // Attach listeners
  socket.on('connect', onConnect);
  socket.on('auth_result', onAuthResult);
  socket.on('connect_error', onConnectError);
  socket.on('disconnect', onDisconnect);
  socket.on('error', onError);
  socket.on('game_state', onGameState);

  // Return cleanup function
  return () => {
    socket.off('connect', onConnect);
    socket.off('auth_result', onAuthResult);
    socket.off('connect_error', onConnectError);
    socket.off('disconnect', onDisconnect);
    socket.off('error', onError);
    socket.off('game_state', onGameState);
  };
}

module.exports = {
  PongMetricsCollector,
  trackSocketMetrics,
};
