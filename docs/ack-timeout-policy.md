# ACK Timeout/Retry Policy Documentation

## Overview

Standardized acknowledgment (ACK) timeout and retry handling for critical Socket.IO events to ensure reliable client-server communication.

## Default Policy

- **Base Timeout**: 5 seconds
- **Max Retries**: 3 attempts
- **Backoff**: Exponential (2x, 4x, 8x multipliers)
- **Max Backoff**: 30 seconds cap

## Event-Specific Configurations

| Event | Timeout | Max Retries | Notes |
|-------|---------|-------------|-------|
| `bet:place` | 5s | 3 | Critical financial operation |
| `prediction:create` | 5s | 3 | User-generated content |
| `parlay:create` | 5s | 2 | Complex multi-bet operation |

## Usage Pattern (Server-side Handlers)

```typescript
import { ACKConfigs } from '../lib/ackPolicy';

const betPlaceHandler = async (payload: BetPlacePayload, ack?: (response: any) => void) => {
  const ackConfig = ACKConfigs['bet:place'];
  
  try {
    // ... business logic ...
    
    console.log(`[ack-policy] bet:place responding within ${ackConfig.timeoutMs}ms window`);
    ack?.({ success: true, betId: result.betId });
  } catch (error) {
    console.error(`[ack-policy] bet:place failed, client should retry within policy`);
    ack?.({ error: 'BET_PLACE_FAILED' });
  }
};
```

## Client-side Implementation

Clients should implement retry logic using the `withACKTimeout` utility or equivalent patterns respecting the documented timeouts and backoff schedules.