# Beta Smoke Test Checklist

## Overview

Comprehensive smoke tests for beta release validation covering critical user journeys, betting flows, pong gameplay, and feature flag functionality.

## Prerequisites

- [ ] Beta environment deployed with latest code
- [ ] Feature flags configured (FEATURE_PONG_BETA=true)
- [ ] Test user accounts with sufficient MuskBucks balance
- [ ] Database seeded with sample predictions

## Core User Flow Tests

### 1. Authentication & Registration
- [ ] User registration with email verification
- [ ] Login with valid credentials
- [ ] Password reset functionality
- [ ] JWT token refresh on expiration
- [ ] Session persistence across browser refresh

### 2. Prediction Market Flow (bet→resolve→payout)

#### Bet Placement
- [ ] Navigate to active prediction market
- [ ] Select prediction option (YES/NO)
- [ ] Enter bet amount (validate balance check)
- [ ] Confirm bet placement
- [ ] Verify balance deduction
- [ ] Check bet appears in user history
- [ ] Validate real-time bet counter updates

#### Market Resolution
- [ ] Admin resolves prediction market
- [ ] Verify winning option selected correctly
- [ ] Check market status changes to RESOLVED
- [ ] Validate resolution timestamp recorded

#### Payout Processing
- [ ] Verify winning bets receive payouts
- [ ] Check payout amounts match expected calculations
- [ ] Validate user balance increases for winners
- [ ] Confirm losing bet amounts remain deducted
- [ ] Verify payout appears in transaction history
- [ ] Check leaderboard updates with new rankings

### 3. Pong Game Integration

#### Match Setup
- [ ] Navigate to Pong game section
- [ ] Select AI difficulty (Easy/Medium/Hard/Impossible)
- [ ] Set wager amount
- [ ] Verify balance sufficient for wager
- [ ] Start match successfully

#### Gameplay
- [ ] Paddle controls respond correctly
- [ ] Ball physics work as expected
- [ ] Score tracking accurate
- [ ] Game ends at 11 points (or configured limit)
- [ ] Connection stability throughout match

#### Match Resolution
- [ ] Match result recorded correctly (win/loss)
- [ ] Wager settled based on outcome
- [ ] ELO rating updated appropriately
- [ ] Stats updated (wins/losses/streak)
- [ ] Match appears in history
- [ ] Achievement progress tracked

## Feature Flag Testing

### Beta Cohort Validation
- [ ] Verify beta users see pong features
- [ ] Confirm non-beta users cannot access pong
- [ ] Test cohort assignment consistency (sticky)
- [ ] Validate percentage distribution

### Kill Switch Testing
- [ ] Disable FEATURE_PONG_BETA flag
- [ ] Verify pong features become unavailable
- [ ] Check graceful degradation (no errors)
- [ ] Re-enable flag and verify restoration

## Error Handling & Edge Cases

- [ ] Insufficient balance scenarios
- [ ] Network disconnection during gameplay
- [ ] Concurrent bet placement conflicts
- [ ] Invalid input validation
- [ ] Rate limiting enforcement
- [ ] Session timeout handling

## Performance Validation

- [ ] Page load times under 3 seconds
- [ ] Real-time updates respond within 500ms
- [ ] Pong game maintains 60 FPS
- [ ] No memory leaks during extended play
- [ ] Socket connections stable

## Rollback Testing

- [ ] Document current system state
- [ ] Test rollback procedures
- [ ] Verify feature flags disable cleanly
- [ ] Confirm data consistency maintained
- [ ] Validate user experience during rollback

## Sign-off

- [ ] All tests executed successfully
- [ ] Critical issues documented and resolved
- [ ] Performance metrics within acceptable ranges
- [ ] Rollback procedures validated
- [ ] Beta release approved for deployment

**Test Execution Date**: _________________
**Tested By**: _________________
**Environment**: _________________
**Result**: PASS / FAIL
**Notes**: _________________