# Beta Cohort Documentation

## Overview

Beta cohort system provides targeted feature rollouts to a small percentage (1-5%) of users for safe testing of new functionality.

## Configuration

### Environment Variables
```bash
# Enable beta cohort system
BETA_COHORT_ENABLED=true

# Set cohort percentage (1-5%)
BETA_COHORT_PERCENTAGE=2
```

## Algorithm

### Sticky Assignment
- Uses SHA-256 hash of `beta-cohort-${userId}` for consistent assignment
- Same user always gets same cohort status (sticky)
- Hash modulo 100 determines bucket (0-99)
- Users with bucket < percentage are in beta cohort

### Example
```typescript
// User ID 123 with 2% cohort
hash('beta-cohort-123') → a1b2c3d4...
parseInt('a1b2c3d4', 16) % 100 = 45
45 < 2? false → User 123 NOT in beta cohort

// User ID 456 with 2% cohort  
hash('beta-cohort-456') → 01234567...
parseInt('01234567', 16) % 100 = 1
1 < 2? true → User 456 IS in beta cohort
```

## Usage

Server middleware automatically adds beta cohort info to authenticated requests. Features can check `req.betaCohort.inBetaCohort` to enable beta functionality.

## Monitoring

Beta cohort assignments are logged for tracking:
```
[beta-cohort] User 456 assigned to beta cohort (2%)
```