-- AdminDashboard Modernization: Database Optimizations
-- Add indexes for efficient user search and filtering

-- Indexes for user search functionality
CREATE INDEX IF NOT EXISTS "idx_users_name_search" ON "User" USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS "idx_users_email_search" ON "User" USING gin(to_tsvector('english', email));
CREATE INDEX IF NOT EXISTS "idx_users_name" ON "User" ("name");
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "User" ("email");

-- Indexes for filtering and sorting
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "User" ("role");
CREATE INDEX IF NOT EXISTS "idx_users_active" ON "User" ("active");
CREATE INDEX IF NOT EXISTS "idx_users_created_at" ON "User" ("createdAt");
CREATE INDEX IF NOT EXISTS "idx_users_musk_bucks" ON "User" ("muskBucks");

-- Composite indexes for common admin queries
CREATE INDEX IF NOT EXISTS "idx_users_role_active" ON "User" ("role", "active");
CREATE INDEX IF NOT EXISTS "idx_users_active_created" ON "User" ("active", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_users_role_created" ON "User" ("role", "createdAt");

-- Index for user ban status lookups (if UserBan table exists)
-- CREATE INDEX IF NOT EXISTS "idx_user_bans_user_active" ON "UserBan" ("userId", "isActive");
-- CREATE INDEX IF NOT EXISTS "idx_user_bans_expires_at" ON "UserBan" ("expiresAt");

-- Optimize leaderboard queries
CREATE INDEX IF NOT EXISTS "idx_users_musk_bucks_desc" ON "User" ("muskBucks" DESC);

-- Index for user activity tracking (if lastActive field exists)
-- CREATE INDEX IF NOT EXISTS "idx_users_last_active" ON "User" ("lastActive");

-- Index for user stats lookups
CREATE INDEX IF NOT EXISTS "idx_user_stats_user_id" ON "UserStats" ("userId");

-- Index for moderation log queries
-- CREATE INDEX IF NOT EXISTS "idx_moderation_log_target_user" ON "ModerationLog" ("targetUserId");
-- CREATE INDEX IF NOT EXISTS "idx_moderation_log_created_at" ON "ModerationLog" ("createdAt");

-- Optimize transaction and bet queries for admin dashboard
CREATE INDEX IF NOT EXISTS "idx_transactions_user_id_created" ON "Transaction" ("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_bets_user_id_created" ON "Bet" ("userId", "createdAt");

-- Add partial indexes for active users (most common admin queries)
CREATE INDEX IF NOT EXISTS "idx_users_active_only" ON "User" ("id", "name", "email", "role", "muskBucks", "createdAt") WHERE "active" = true;