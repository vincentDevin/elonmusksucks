# Rollback Procedures

## Overview

Emergency rollback procedures for production incidents, covering feature flag kill switches, deployment reverts, and validation steps.

## Immediate Response (0-5 minutes)

### 1. Feature Flag Kill Switch

**Disable problematic features immediately:**

```bash
# SSH to production server
ssh production-server

# Set environment variables (requires app restart)
export FEATURE_PONG_BETA=false
export FEATURE_ENHANCED_CHAT=false
export FEATURE_ADVANCED_ANALYTICS=false
export FEATURE_EXPERIMENTAL_UI=false

# OR use runtime kill switch (immediate effect)
curl -X POST https://api.elonmusksucks.net/admin/feature-flags/disable \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"flag": "pong_beta"}'
```

**Validate kill switch activation:**
- [ ] Check server logs for kill switch confirmation
- [ ] Verify affected features no longer accessible
- [ ] Monitor error rates drop within 30 seconds

### 2. Beta Cohort Emergency Disable

```bash
# Disable beta cohort system
export BETA_COHORT_ENABLED=false
export BETA_COHORT_PERCENTAGE=0

# Restart application servers
pm2 restart all
```

## Application Rollback (5-15 minutes)

### 3. Container/Code Revert

**Docker deployment:**
```bash
# Find previous working image
docker images | grep elonmusksucks | head -5

# Rollback to previous version
docker-compose down
docker-compose up -d --scale app=3 elonmusksucks:v1.2.3

# Verify rollback
curl https://api.elonmusksucks.net/health
```

**Kubernetes deployment:**
```bash
# Rollback to previous deployment
kubectl rollout undo deployment/elonmusksucks-api
kubectl rollout undo deployment/elonmusksucks-client

# Monitor rollback progress
kubectl rollout status deployment/elonmusksucks-api
```

### 4. Database Rollback (CAUTION)

**Only if schema changes were deployed:**

```bash
# Connect to database
psql $DATABASE_URL

# Run rollback migration (prepare these in advance)
\i migrations/rollback_v1.2.4_to_v1.2.3.sql

# Verify data integrity
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM predictions;
```

## Validation & Monitoring (15-30 minutes)

### 5. Health Checks

**System health validation:**
- [ ] API endpoints responding (< 200ms p95)
- [ ] Database connections stable
- [ ] Redis cache operational
- [ ] Socket.IO connections restored
- [ ] Background jobs processing

**User experience validation:**
- [ ] User registration/login working
- [ ] Bet placement functional
- [ ] Leaderboard updates correctly
- [ ] Chat system operational
- [ ] No JavaScript errors in browser console

### 6. Monitoring Dashboard Review

**Key metrics to monitor:**
- Error rate < 1%
- Response time p95 < 500ms
- Active user sessions stable
- Database query performance normal
- Redis hit rate > 95%

## Communication & Documentation

### 7. Incident Response

**Immediate notifications:**
```bash
# Slack notification
curl -X POST $SLACK_WEBHOOK \
  -H 'Content-Type: application/json' \
  -d '{"text": "🚨 ROLLBACK INITIATED: Feature flags disabled, deployment reverted to v1.2.3"}'

# Email stakeholders
echo "Rollback completed successfully. System stable." | \
  mail -s "Production Rollback - $(date)" team@elonmusksucks.net
```

**Documentation requirements:**
- [ ] Incident ticket created with timeline
- [ ] Root cause analysis scheduled
- [ ] Rollback steps executed documented
- [ ] Post-incident review meeting scheduled

## Recovery Planning

### 8. Forward Fix Preparation

**Before re-deployment:**
- [ ] Fix identified in staging environment
- [ ] Comprehensive testing completed
- [ ] Rollback plan updated for new version
- [ ] Feature flags prepared for gradual re-enable
- [ ] Monitoring alerts tuned for early detection

**Re-deployment checklist:**
- [ ] Deploy to staging first
- [ ] Run full smoke test suite
- [ ] Enable features for 1% of users initially
- [ ] Monitor for 24 hours before full enable
- [ ] Document lessons learned

## Emergency Contacts

**Escalation chain:**
1. On-call engineer: [phone/slack]
2. Engineering manager: [phone/slack]
3. CTO: [phone/slack]
4. Infrastructure team: [slack channel]

## Rollback Scenarios

| Scenario | Actions | Time Estimate |
|----------|---------|---------------|
| Feature bug | Kill switch only | 0-2 minutes |
| Performance degradation | Kill switch + code rollback | 5-10 minutes |
| Data corruption | Full rollback + DB revert | 15-30 minutes |
| Security incident | Immediate shutdown + investigation | Variable |

**Last Updated**: December 2024
**Tested**: [Date of last rollback drill]
**Next Review**: Q1 2025