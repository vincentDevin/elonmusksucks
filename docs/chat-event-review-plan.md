# Chat Event System Review & Fix Plan

## Findings

- **Duplicate `chat:message:sent` events**
  - `chatHandlers.ts` emits a `chat:message:sent` event after saving a message.
  - `message.service.ts` also publishes the same event as part of message creation, leading to duplicate (sometimes triple) counts.
- **Typing events treated like message events**
  - `achievementEventHandler.ts` subscribes to `chat:typing:start` and `chat:typing:stop` along with `chat:message:sent`. Without strict filtering, typing notifications can be processed as chat messages by downstream counters.
- **Activity logging may mislabel non-chat actions**
  - `message.service.ts` logs chat activity with `activityType: 'chat_message_sent'`. Other features that reuse the `user:activity:log` pathway without overriding the type can be miscounted as chat messages (e.g. timeline posts, reactions).
- **Multiple event bus implementations**
  - `lib/EventBus.ts` defines an `EventBus` with connection pooling.
  - `services/eventBus.service.ts` exposes a separate `RedisEventBus`. Using both leads to inconsistent publishing behavior and confusion over which bus is authoritative.

## Plan

1. **Remove duplicate message event emission**
   - Keep the `chat:message:sent` publish inside `message.service.ts` and delete the duplicate call in `chatHandlers.ts`.
   - Ensure other features use the service rather than emitting directly.
2. **Clarify typing vs. message events**
   - Update statistics/achievement processing so only `chat:message:sent` affects message counters.
   - If typing events are needed for achievements, handle them separately without touching message metrics.
3. **Harden activity logging**
   - Require explicit `activityType` values when emitting `user:activity:log` events so posts, comments, and reactions cannot fall back to `'chat_message_sent'`.
   - Review existing calls to ensure timeline actions use distinct activity types.
4. **Consolidate event bus usage**
   - Decide on a single `EventBus` implementation (preferably the pooled version) and remove the alternative to avoid split responsibility.
   - Update handlers and services to depend on the unified bus.
5. **Reduce redundant handlers**
   - After unifying event emission, verify whether some handlers (e.g., chat-related Redis handlers) can be merged or simplified to minimize surface area.

Implementing the above should eliminate inflated chat statistics and bring all user interactions under a consistent event bus strategy without introducing new files or added complexity.

