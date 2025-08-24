# JWT Key Rotation Playbook

## Overview

JWT key rotation enables secure key lifecycle management with zero-downtime transitions using dual-key support and overlap periods.

## Rotation Procedure

### 1. Pre-rotation Checks
```bash
# Verify current key configuration
curl -H "Authorization: Bearer $TEST_TOKEN" localhost:3000/api/auth/verify

# Check validation keys count (should be 1 before rotation)
grep -r "getValidationKeys" apps/server/src/utils/jwtHelpers.ts
```

### 2. Execute Rotation
```javascript
// In server console or admin endpoint
const { rotateKeys } = require('./utils/jwtHelpers');

// Generate new key with unique ID
const newKeyId = `key-${Date.now()}`;
rotateKeys(newKeyId);

console.log('Key rotation initiated. Overlap period: 24 hours');
```

### 3. Validation Period (24 hours)
```bash
# Test old tokens still work (should succeed)
curl -H "Authorization: Bearer $OLD_TOKEN" localhost:3000/api/auth/verify

# Test new tokens work (should succeed)  
curl -H "Authorization: Bearer $NEW_TOKEN" localhost:3000/api/auth/verify

# Monitor auth middleware logs for key usage
tail -f logs/server.log | grep "\[jwt\]"
```

### 4. Cleanup (after overlap period)
```javascript
// Remove expired keys automatically or manually
// Keys with expiresAt < now() are filtered out by getValidationKeys()
```

## Rollback Procedure

If issues occur during rotation, the previous key remains valid during the overlap period. No immediate action needed - wait for natural token expiration or issue new tokens with the current (working) key.