// Event Flow Validation Script
// Validates that the unified event system is working correctly
// Run with: ts-node src/scripts/eventFlowValidation.ts
/*
import { eventBus } from '../lib/EventBus';
import { unifiedActivityService } from '../services/unifiedActivity.service';
import { REDIS_CHANNELS, ActivityEventType } from '@ems/types';
import redisClient from '../lib/redis';

interface ValidationResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message: string;
  duration?: number;
}

class EventFlowValidator {
  private results: ValidationResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🔍 Starting Event Flow Validation...\n');

    try {
      await this.testRedisConnection();
      await this.testEventBusPublishing();
      await this.testUnifiedActivityService();
      await this.testRedisChannelConstants();
      await this.testActivityEventTypes();

      this.printResults();
    } catch (error) {
      console.error('❌ Validation failed with error:', error);
      process.exit(1);
    } finally {
      await redisClient.quit();
      process.exit(0);
    }
  }

  private async testRedisConnection(): Promise<void> {
    const start = Date.now();
    try {
      const result = await redisClient.ping();
      if (result === 'PONG') {
        this.addResult(
          'Redis Connection',
          'PASS',
          'Successfully connected to Redis',
          Date.now() - start,
        );
      } else {
        this.addResult('Redis Connection', 'FAIL', `Unexpected ping response: ${result}`);
      }
    } catch (error) {
      this.addResult('Redis Connection', 'FAIL', `Connection failed: ${error}`);
    }
  }

  private async testEventBusPublishing(): Promise<void> {
    const start = Date.now();
    const testChannel = 'test:event:validation';
    const testPayload = { test: true, timestamp: Date.now() };

    try {
      // Test publishing through eventBus
      await eventBus.publish(testChannel, testPayload);
      this.addResult(
        'EventBus Publishing',
        'PASS',
        'Successfully published test event',
        Date.now() - start,
      );
    } catch (error) {
      this.addResult('EventBus Publishing', 'FAIL', `Publishing failed: ${error}`);
    }
  }

  private async testUnifiedActivityService(): Promise<void> {
    const start = Date.now();

    try {
      // Test getting recent activities
      const activities = await unifiedActivityService.getRecentActivities(1);
      this.addResult(
        'UnifiedActivityService',
        'PASS',
        `Retrieved ${activities.length} activities`,
        Date.now() - start,
      );

      // Validate activity structure if activities exist
      if (activities.length > 0) {
        const activity = activities[0];
        const hasRequiredFields =
          typeof activity.id === 'string' &&
          typeof activity.type === 'string' &&
          typeof activity.timestamp === 'string' &&
          typeof activity.userId === 'number';

        if (hasRequiredFields) {
          this.addResult('Activity Structure', 'PASS', 'Activity objects have correct structure');
        } else {
          this.addResult('Activity Structure', 'FAIL', 'Activity objects missing required fields');
        }
      }
    } catch (error) {
      this.addResult('UnifiedActivityService', 'FAIL', `Service error: ${error}`);
    }
  }

  private async testRedisChannelConstants(): Promise<void> {
    const start = Date.now();

    try {
      // Test that REDIS_CHANNELS constants are properly defined
      const channelCount = Object.keys(REDIS_CHANNELS).length;

      if (channelCount > 50) {
        this.addResult(
          'REDIS_CHANNELS Constants',
          'PASS',
          `Found ${channelCount} channel constants`,
          Date.now() - start,
        );
      } else {
        this.addResult(
          'REDIS_CHANNELS Constants',
          'FAIL',
          `Only ${channelCount} channels found, expected 50+`,
        );
      }

      // Test some key channels exist
      const keyChannels = ['BET_PLACE', 'PREDICTION_CREATE', 'MODERATION_USER_BAN'];
      const missingChannels = keyChannels.filter((channel) => !REDIS_CHANNELS[channel]);

      if (missingChannels.length === 0) {
        this.addResult('Key Channels Present', 'PASS', 'All key channels are defined');
      } else {
        this.addResult(
          'Key Channels Present',
          'FAIL',
          `Missing channels: ${missingChannels.join(', ')}`,
        );
      }
    } catch (error) {
      this.addResult('REDIS_CHANNELS Constants', 'FAIL', `Error accessing constants: ${error}`);
    }
  }

  private async testActivityEventTypes(): Promise<void> {
    const start = Date.now();

    try {
      // Test that ActivityEventType constants are properly defined
      const typeCount = Object.keys(ActivityEventType).length;

      if (typeCount > 10) {
        this.addResult(
          'ActivityEventType Constants',
          'PASS',
          `Found ${typeCount} activity types`,
          Date.now() - start,
        );
      } else {
        this.addResult(
          'ActivityEventType Constants',
          'FAIL',
          `Only ${typeCount} types found, expected 10+`,
        );
      }

      // Test key activity types exist
      const keyTypes = ['BET_PLACED', 'PREDICTION_CREATED', 'BIG_WIN'];
      const missingTypes = keyTypes.filter((type) => !ActivityEventType[type]);

      if (missingTypes.length === 0) {
        this.addResult('Key Activity Types', 'PASS', 'All key activity types are defined');
      } else {
        this.addResult('Key Activity Types', 'FAIL', `Missing types: ${missingTypes.join(', ')}`);
      }
    } catch (error) {
      this.addResult('ActivityEventType Constants', 'FAIL', `Error accessing constants: ${error}`);
    }
  }

  private addResult(
    test: string,
    status: 'PASS' | 'FAIL',
    message: string,
    duration?: number,
  ): void {
    this.results.push({ test, status, message, duration });
  }

  private printResults(): void {
    console.log('\n📊 Event Flow Validation Results:\n');
    console.log('='.repeat(80));

    let passed = 0;
    let failed = 0;

    this.results.forEach((result) => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      const duration = result.duration ? ` (${result.duration}ms)` : '';
      console.log(`${icon} ${result.test.padEnd(30)} | ${result.message}${duration}`);

      if (result.status === 'PASS') passed++;
      else failed++;
    });

    console.log('='.repeat(80));
    console.log(`📈 Summary: ${passed} passed, ${failed} failed\n`);

    if (failed === 0) {
      console.log('🎉 All event flow validation tests passed!');
    } else {
      console.log('⚠️  Some tests failed - event system may need attention');
    }
  }
}

// Run validation if script is executed directly
if (require.main === module) {
  const validator = new EventFlowValidator();
  validator.runAllTests().catch(console.error);
}

export { EventFlowValidator };
*/
