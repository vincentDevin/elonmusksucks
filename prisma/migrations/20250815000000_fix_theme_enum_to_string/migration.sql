-- Convert theme column from enum to string and add new article reaction/comment tables

-- First, update theme column to string and set default values
ALTER TABLE "User" ALTER COLUMN "theme" TYPE TEXT;
ALTER TABLE "User" ALTER COLUMN "theme" SET DEFAULT 'light-clean';

-- Drop the old Theme enum
DROP TYPE "Theme";

-- Add missing columns to Achievement table to match schema
ALTER TABLE "Achievement" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Achievement" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Achievement" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Achievement" ADD COLUMN IF NOT EXISTS "rarity" TEXT NOT NULL DEFAULT 'common';
ALTER TABLE "Achievement" ADD COLUMN IF NOT EXISTS "targetValue" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Achievement" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Achievement" ADD COLUMN IF NOT EXISTS "autoAward" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Achievement" ADD COLUMN IF NOT EXISTS "manualOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Achievement" ADD COLUMN IF NOT EXISTS "isShame" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Achievement" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Achievement" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add unique constraint for slug column (if it doesn't exist)
CREATE UNIQUE INDEX IF NOT EXISTS "Achievement_slug_key" ON "Achievement"("slug");

-- CreateTable
CREATE TABLE "ArticleReaction" (
    "id" SERIAL NOT NULL,
    "articleId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'like',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleComment" (
    "id" SERIAL NOT NULL,
    "articleId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArticleReaction_articleId_userId_type_key" ON "ArticleReaction"("articleId", "userId", "type");

-- CreateIndex
CREATE INDEX "ArticleReaction_articleId_type_idx" ON "ArticleReaction"("articleId", "type");

-- CreateIndex
CREATE INDEX "ArticleReaction_userId_idx" ON "ArticleReaction"("userId");

-- CreateIndex
CREATE INDEX "ArticleComment_articleId_createdAt_idx" ON "ArticleComment"("articleId", "createdAt");

-- CreateIndex
CREATE INDEX "ArticleComment_userId_idx" ON "ArticleComment"("userId");

-- AddForeignKey
ALTER TABLE "ArticleReaction" ADD CONSTRAINT "ArticleReaction_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleReaction" ADD CONSTRAINT "ArticleReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleComment" ADD CONSTRAINT "ArticleComment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleComment" ADD CONSTRAINT "ArticleComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;