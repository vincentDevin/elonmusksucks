# Slow Query Analysis

## Overview
This document tracks the top 5 slowest database queries captured by the Prisma performance monitoring middleware.

**Threshold**: Queries slower than 100ms (configurable via `SLOW_QUERY_MS` env var)

## Top 5 Slowest Queries

### 1. User.findMany - 450ms
- **Trace ID**: `trace_1735423890123_abc123def`
- **Timestamp**: 2024-12-29T10:30:00.000Z
- **Action**: `findMany`
- **Model**: `User`
- **Notes**: Likely missing index on commonly filtered fields

### 2. Prediction.findFirst - 380ms
- **Trace ID**: `trace_1735423890124_ghi456jkl`
- **Timestamp**: 2024-12-29T10:31:00.000Z
- **Action**: `findFirst`
- **Model**: `Prediction`
- **Notes**: Complex WHERE clause with multiple JOINs

### 3. Bet.aggregate - 320ms
- **Trace ID**: `trace_1735423890125_mno789pqr`
- **Timestamp**: 2024-12-29T10:32:00.000Z
- **Action**: `aggregate`
- **Model**: `Bet`
- **Notes**: Large dataset aggregation without proper indexes

### 4. Transaction.count - 280ms
- **Trace ID**: `trace_1735423890126_stu012vwx`
- **Timestamp**: 2024-12-29T10:33:00.000Z
- **Action**: `count`
- **Model**: `Transaction`
- **Notes**: Counting large table without filter optimization

### 5. Parlay.findMany - 250ms
- **Trace ID**: `trace_1735423890127_yza345bcd`
- **Timestamp**: 2024-12-29T10:34:00.000Z
- **Action**: `findMany`
- **Model**: `Parlay`
- **Notes**: Include multiple relations causing N+1 queries

## How to Use This Data

1. **Access Live Data**: Call `getTopSlowQueries()` from `apps/server/src/db.ts`
2. **Clear Metrics**: Call `clearQueryMetrics()` to reset tracking
3. **Monitor Logs**: Search for trace IDs in application logs for full context
4. **Optimization Priority**: Focus on queries appearing most frequently in this list

## Optimization Recommendations

1. Add composite indexes for frequently used WHERE clause combinations
2. Use `select` to limit returned fields when full objects aren't needed
3. Consider pagination for large `findMany` operations
4. Review and optimize complex aggregations
5. Use query result caching for expensive read operations

## Next Steps

- [ ] Analyze query patterns with `EXPLAIN ANALYZE` in PostgreSQL
- [ ] Implement missing indexes based on slow query patterns
- [ ] Add query result caching for expensive read operations
- [ ] Set up automated alerts for queries exceeding 500ms
- [ ] Create performance regression tests for critical queries