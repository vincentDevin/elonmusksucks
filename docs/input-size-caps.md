# Input Size Caps Documentation

## Overview

Server-side input validation guards to prevent oversized content that could impact system performance or user experience.

## Size Limits

| Content Type | Limit | HTTP Status | Error Response |
|--------------|-------|-------------|----------------|
| Chat Message | 1,000 chars | Socket Error | `MESSAGE_TOO_LONG` |
| Prediction Title | 200 chars | 413 | `Prediction title too long` |
| Prediction Description | 2,000 chars | 413 | `Prediction description too long` |
| Prediction Option Text | 100 chars | 413 | `Prediction option text too long` |

## Implementation

### Server-side Guards (HTTP)
```typescript
// Returns HTTP 413 with structured error response
{
  error: 'Content too long',
  limit: 1000,
  actual: 1234
}
```

### Socket-side Guards
```typescript
// Returns socket error event with structured data
socket.emit('chat:error', {
  message: 'MESSAGE_TOO_LONG',
  limit: 1000,
  actual: 1234
});
```

## Error Handling

**Client Implementation**: Check content length before submission to avoid errors
**Server Logging**: Oversized content logged with `[input-caps]` prefix for monitoring
**User Feedback**: Clear error messages with actual vs. limit character counts

## Configuration

Size limits are defined in `@ems/types` as `InputSizeLimits` constants and can be adjusted per content type.

## Security Notes

These caps complement existing payload size guards and rate limiting to prevent abuse and ensure system stability.