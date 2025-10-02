# Project System Pain Points Review

## Summary
- Financial admin pages are calling newer client APIs that expect paginated totals in one shape, but the server is still returning the legacy DTO which breaks list rendering and pagination.
- Several admin dashboards subscribe to socket rooms and event names that the backend never exposes, so real-time updates and even initial data loads silently fail.
- Chat presence bookkeeping in Redis expires active users after one hour and the client blocks anonymous visitors from ever loading history, which makes the online counter and typing indicators unreliable.

## Admin Dashboard Findings

### Financial dashboard API contract drift
- The client stores financial results in a `PaginatedFinancialData` object with top-level `totalPages`, `hasNextPage`, etc., and passes it directly into pagination controls.【F:apps/client/src/components/admin/financial/FinancialDashboard.tsx†L70-L138】【F:apps/client/src/components/admin/financial/FinancialDashboard.tsx†L454-L519】【F:apps/client/src/api/admin.ts†L363-L420】
- The server maps results to `AdminFinancialDataResponse`, nesting pagination under `payload.pagination` and omitting `hasNextPage/hasPreviousPage` at the root, so the dashboard never receives the shape it expects.【F:apps/server/src/controllers/admin.controller.ts†L420-L439】【F:apps/server/src/view/admin.view.ts†L135-L178】
- **Impact:** Tables render with empty totals and `CompactPagination` sees `undefined`, so the page cannot paginate or show counts. Update the server to return the new shape (or adapt the client to the DTO).

### Prediction dashboard socket integration gaps
- The dashboard joins an `admin:predictions` room for scoped events, but the backend only authorizes `'admin', 'admin:metrics', 'admin:moderation', 'admin:feeds', 'admin:events'`, so the join call is rejected at the room middleware.【F:apps/client/src/components/admin/predictions/PredictionDashboard.tsx†L152-L166】【F:apps/server/src/handlers/roomHandlers.ts†L7-L72】
- The UI listens for colon-delimited events such as `prediction:created` / `prediction:resolved` / `prediction:approved`, yet the redis fan-out emits camelCase names (`predictionCreated`, `predictionResolved`) and never forwards the approval channel at all.【F:apps/client/src/components/admin/predictions/PredictionDashboard.tsx†L167-L199】【F:apps/server/src/handlers/redisEventHandlers.ts†L22-L49】【F:apps/server/src/services/admin.service.ts†L82-L110】【F:apps/server/src/services/admin.service.ts†L146-L187】
- **Impact:** Real-time moderation queues and bulk actions never refresh, making the dashboard appear frozen. Align room names and ensure `REDIS_CHANNELS.PREDICTION_APPROVED` is bridged to the socket with the same event IDs the client expects.

### User management real-time updates incomplete
- The client refreshes search results when it receives `adminModerationUserBan`, `adminModerationUserUnban`, `adminModerationUserMute`, or `adminModerationUserKick`.【F:apps/client/src/components/admin/users/UserManagement.tsx†L155-L174】
- The server currently relays only the ban and mute channels (plus message deletes) to admins; there is no broadcast for unban or kick events, so those UI listeners never fire.【F:apps/server/src/handlers/redisEventHandlers.ts†L102-L138】
- **Impact:** After an admin unbans or kicks someone, the list still shows the stale status until a manual refresh. Add redis subscriptions for `MODERATION_USER_UNBAN` / `MODERATION_USER_KICK` and emit matching socket events.

### Content dashboard event coverage
- The content dashboard subscribes to `content:updated`, `content:moderated`, `feeds:updated`, and `articles:bulk-moderated`, but no server handler emits those socket events today.【F:apps/client/src/components/admin/content-management/ContentDashboard.tsx†L86-L114】
- **Impact:** The page never reacts to background processing. Either emit those events from the feed/timeline handlers or remove the subscriptions and schedule periodic refreshes.

## Chat and Redis Findings

### Presence TTL expires active users
- Presence keys get a one-hour TTL only the first time a user connects (`after === 1`), and the global set shares the same expiry. After an hour with no brand-new joins, Redis expires the set even while users remain connected.【F:apps/server/src/handlers/chatHandlers.ts†L58-L80】【F:apps/server/src/lib/cacheTTL.ts†L11-L44】
- **Impact:** `chat:usersOnline` begins reporting zero users, downstream dashboards lose accurate counts, and typing indicators are cleared. Refresh the TTL during heartbeat/publishOnlineUsers or switch to `pexpire` on every ping.

### Guest chat history never loads
- The chat provider bails out if `useAuth` returns no user, so anonymous visitors never emit `chat:history` and the widget stays blank despite the server supporting guest history.【F:apps/client/src/contexts/ChatContext.tsx†L72-L102】
- **Impact:** Logged-out traffic cannot see recent messages, skewing engagement metrics and making the join/leave toasts appear broken. Remove the auth guard or request history once the socket connects regardless of auth state.

### Typing indicators rely on local state only
- The typing handler keeps a per-process `Set`/`Map` without cross-instance storage; when the process restarts, lingering timers never clear and redis still believes the user is typing.【F:apps/server/src/handlers/chatHandlers.ts†L203-L259】
- **Impact:** Multi-instance deployments can show stuck typing states. Consider storing typing expirations in Redis (e.g., key with short TTL) or publishing an explicit reset during cleanup.
