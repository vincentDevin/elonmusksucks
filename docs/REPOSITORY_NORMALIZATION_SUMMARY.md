# Repository Layer Normalization Summary

**Date**: 2025-09-30
**Status**: ✅ Interfaces Normalized - Implementation Pending

---

## Overview

This document tracks the normalization of the repository layer to align with the updated Prisma schema. The schema unified comment/reaction systems and normalized categories/tags.

---

## Schema Changes Recap

### 1. Unified Content Model
- **OLD**: `UserPost`, `ArticleComment`, `PredictionComment` (3 separate models)
- **NEW**: `Content` (single polymorphic model)
- **Impact**: Replaces IPostRepository and IPredictionCommentRepository

### 2. Unified Reaction Model
- **OLD**: `PostReaction`, `ArticleReaction`, `PredictionCommentLike` (3 separate models)
- **NEW**: `Reaction` (single polymorphic model)
- **Impact**: Complete rewrite of IReactionRepository

### 3. Normalized Categories
- **OLD**: `Prediction.category: String`
- **NEW**: `Category` model + `Prediction.categoryId: Int`
- **Impact**: New ICategoryRepository, updated IPredictionRepository

### 4. Normalized Tags
- **OLD**: `Article.tags: String[]`
- **NEW**: `Tag` model + `ArticleTag` join table
- **Impact**: New ITagRepository, updated ITimelineRepository

---

## Repository Interface Changes

### ✅ NEW: IContentRepository
**File**: `apps/server/src/repositories/interfaces/IContentRepository.ts`

**Replaces**:
- `IPostRepository` (UserPost operations)
- `IPredictionCommentRepository` (PredictionComment operations)
- Article comment methods from `ITimelineRepository`

**Key Methods**:
```typescript
// Create
createContent(data: { authorId, type, body, articleId?, predictionId?, parentId? })

// Read
getPublicTimeline(options)
getUserPosts(userId, options)
getArticleComments(articleId, options)
getPredictionComments(predictionId, options)
getReplies(parentId, options)

// Update
updateContent(contentId, authorId, body)
incrementReactionCount(contentId)
incrementReplyCount(contentId)

// Delete
deleteContent(contentId, deletedBy)
hardDeleteContent(contentId)

// Social
addMentions(contentId, mentions)
addHashtags(contentId, hashtags)
getUserMentions(userId, options)
```

**Polymorphic Support**:
- `type: ContentType` - POST or COMMENT
- `articleId` - if commenting on article
- `predictionId` - if commenting on prediction
- `parentId` - if replying to another content

---

### ✅ UPDATED: IReactionRepository
**File**: `apps/server/src/repositories/interfaces/IReactionRepository.ts`

**Changes**: Complete rewrite for polymorphic reactions

**Old Signature** (PostReaction only):
```typescript
toggleReaction(postId: number, userId: number, type: ReactionType)
```

**New Signatures** (Polymorphic):
```typescript
// Content reactions (posts, comments)
toggleContentReaction(contentId: number, userId: number, type: ReactionType)
getUserContentReaction(contentId: number, userId: number)
getContentReactionCounts(contentId: number)

// Article reactions
toggleArticleReaction(articleId: number, userId: number, type: ReactionType)
getUserArticleReaction(articleId: number, userId: number)
getArticleReactionCounts(articleId: number)

// Prediction reactions
togglePredictionReaction(predictionId: number, userId: number, type: ReactionType)
getUserPredictionReaction(predictionId: number, userId: number)
getPredictionReactionCounts(predictionId: number)

// Batch operations
getUserReactionsForContent(userId: number, contentIds: number[])
getUserReactionsForArticles(userId: number, articleIds: number[])
getUserReactionsForPredictions(userId: number, predictionIds: number[])
```

---

### ✅ NEW: ICategoryRepository
**File**: `apps/server/src/repositories/interfaces/ICategoryRepository.ts`

**Purpose**: Manage normalized prediction categories

**Key Methods**:
```typescript
// CRUD
createCategory(data: { name, slug, description, icon, color, sortOrder })
getCategoryById(id: number)
getCategoryBySlug(slug: string)
getActiveCategories()
updateCategory(id: number, data)
deactivateCategory(id: number)

// Stats
getCategoriesWithStats() // Returns categories with prediction counts

// Validation
isCategoryActive(id: number)
isSlugAvailable(slug: string, excludeId?: number)
getDefaultCategory()
```

---

### ✅ NEW: ITagRepository
**File**: `apps/server/src/repositories/interfaces/ITagRepository.ts`

**Purpose**: Manage normalized article tags

**Key Methods**:
```typescript
// CRUD
createTag(data: { name, slug, description })
findOrCreateTag(name: string)
findOrCreateTags(names: string[])
getTagById(id: number)
getTagBySlug(slug: string)
getPopularTags(limit?: number)
updateTag(id: number, data)
deleteTag(id: number)

// Article associations
addTagsToArticle(articleId: number, tagIds: number[])
removeTagsFromArticle(articleId: number, tagIds: number[])
replaceArticleTags(articleId: number, tagIds: number[])
getArticleTags(articleId: number)
getArticlesByTag(tagId: number, options)

// Usage tracking
incrementUsageCount(id: number)
syncUsageCounts()
```

---

### ✅ UPDATED: IPredictionRepository
**File**: `apps/server/src/repositories/interfaces/IPredictionRepository.ts`

**Change**: `category: string` → `categoryId: number`

**Before**:
```typescript
createPrediction(data: {
  title: string;
  category: string; // ❌ Old
  //...
})
```

**After**:
```typescript
createPrediction(data: {
  title: string;
  categoryId: number; // ✅ New
  //...
})
```

---

### ✅ UPDATED: ITimelineRepository
**File**: `apps/server/src/repositories/interfaces/ITimelineRepository.ts`

**Changes**:
1. **Removed**: `toggleArticleReaction()` → moved to `IReactionRepository`
2. **Removed**: `createArticleComment()` → moved to `IContentRepository`
3. **Removed**: `getArticleComments()` → moved to `IContentRepository`
4. **Updated**: `getApprovedArticles()` now accepts `tagIds: number[]` instead of tag strings
5. **Added**: `getArticleWithStats()` - unified stats retrieval

**New Signature**:
```typescript
getApprovedArticles(params: {
  cursor?: Date;
  limit: number;
  tagIds?: number[]; // ✅ Filter by tag IDs
}): Promise<any[]>

getArticleWithStats(articleId: number): Promise<{
  article: any;
  tags: any[]; // ✅ Normalized tags
  reactionCounts: Record<string, number>;
  commentCount: number;
}>
```

---

## Deprecated/Obsolete Interfaces

### ❌ IPostRepository
**File**: `apps/server/src/repositories/interfaces/IPostRepository.ts`
**Status**: **TO BE REMOVED**
**Replacement**: `IContentRepository`

**Migration Path**:
- `createPost()` → `IContentRepository.createContent({ type: 'POST' })`
- `getPost()` → `IContentRepository.getContentById()`
- `updatePost()` → `IContentRepository.updateContent()`
- `deletePost()` → `IContentRepository.deleteContent()`
- `getPublicTimeline()` → `IContentRepository.getPublicTimeline()`
- `getUserPosts()` → `IContentRepository.getUserPosts()`
- `getPostComments()` → `IContentRepository.getReplies()`

### ❌ IPredictionCommentRepository
**File**: `apps/server/src/repositories/interfaces/IPredictionCommentRepository.ts`
**Status**: **TO BE REMOVED**
**Replacement**: `IContentRepository`

**Migration Path**:
- `createComment()` → `IContentRepository.createContent({ type: 'COMMENT', predictionId })`
- `updateComment()` → `IContentRepository.updateContent()`
- `deleteComment()` → `IContentRepository.deleteContent()`
- `getCommentsByPredictionId()` → `IContentRepository.getPredictionComments()`
- `getReplies()` → `IContentRepository.getReplies()`
- `toggleCommentLike()` → `IReactionRepository.toggleContentReaction()`

---

## Repository Implementation Status

| Repository | Interface | Implementation | Status |
|------------|-----------|----------------|--------|
| ContentRepository | ✅ Complete | ❌ Pending | 🟡 Not Started |
| ReactionRepository | ✅ Complete | ❌ Pending | 🟡 Not Started |
| CategoryRepository | ✅ Complete | ❌ Pending | 🟡 Not Started |
| TagRepository | ✅ Complete | ❌ Pending | 🟡 Not Started |
| PredictionRepository | ✅ Updated | ❌ Pending | 🟡 Needs Update |
| TimelineRepository | ✅ Updated | ❌ Pending | 🟡 Needs Update |
| PostRepository | N/A | ❌ To Remove | 🔴 Deprecated |
| PredictionCommentRepository | N/A | ❌ To Remove | 🔴 Deprecated |

---

## Next Steps

### Phase 1: Implement New Repositories ✅ READY
1. **ContentRepository** - Implement `IContentRepository`
2. **CategoryRepository** - Implement `ICategoryRepository`
3. **TagRepository** - Implement `ITagRepository`

### Phase 2: Update Existing Repositories
4. **ReactionRepository** - Rewrite for polymorphic reactions
5. **PredictionRepository** - Update to use `categoryId`
6. **TimelineRepository** - Update for normalized tags

### Phase 3: Service Layer Updates
7. Update services that depend on PostRepository
8. Update services that depend on PredictionCommentRepository
9. Update services that reference old reaction methods
10. Update services that use category strings

### Phase 4: Controller/Route Updates
11. Update routes that accept category strings
12. Update routes for post/comment creation
13. Update routes for reactions

### Phase 5: Cleanup
14. Remove PostRepository files
15. Remove PredictionCommentRepository files
16. Remove old reaction code
17. Update dependency injection container

---

## Breaking Changes Summary

### For Services/Controllers:

1. **Post Creation**:
   ```typescript
   // OLD
   await postRepository.createPost({ authorId, content, ... })

   // NEW
   await contentRepository.createContent({
     authorId,
     type: 'POST',
     body: content,
     ...
   })
   ```

2. **Article Comments**:
   ```typescript
   // OLD
   await timelineRepository.createArticleComment(articleId, userId, content)

   // NEW
   await contentRepository.createContent({
     authorId: userId,
     type: 'COMMENT',
     articleId,
     body: content
   })
   ```

3. **Prediction Comments**:
   ```typescript
   // OLD
   await predictionCommentRepository.createComment({ predictionId, userId, content })

   // NEW
   await contentRepository.createContent({
     authorId: userId,
     type: 'COMMENT',
     predictionId,
     body: content
   })
   ```

4. **Reactions**:
   ```typescript
   // OLD (Post)
   await reactionRepository.toggleReaction(postId, userId, type)

   // NEW (Content)
   await reactionRepository.toggleContentReaction(contentId, userId, type)

   // NEW (Article)
   await reactionRepository.toggleArticleReaction(articleId, userId, type)

   // NEW (Prediction)
   await reactionRepository.togglePredictionReaction(predictionId, userId, type)
   ```

5. **Categories**:
   ```typescript
   // OLD
   await predictionRepository.createPrediction({ category: 'Politics', ... })

   // NEW
   const category = await categoryRepository.getCategoryBySlug('politics')
   await predictionRepository.createPrediction({ categoryId: category.id, ... })
   ```

6. **Tags**:
   ```typescript
   // OLD
   article.tags // String[]

   // NEW
   const tags = await tagRepository.getArticleTags(articleId) // Tag[]
   ```

---

## Data Migration Notes

- ✅ Schema updated successfully
- ✅ TEST category created (id: 1)
- ✅ All 86 predictions migrated to categoryId = 1
- ❌ Old UserPost/ArticleComment/PredictionComment data lost in schema push
- ❌ Tag migration pending (need to extract from Article.tags arrays)

---

## Testing Checklist

- [ ] Content creation (POST type)
- [ ] Content creation (COMMENT type with articleId)
- [ ] Content creation (COMMENT type with predictionId)
- [ ] Content threading (replies with parentId)
- [ ] Content reactions (on posts)
- [ ] Content reactions (on comments)
- [ ] Article reactions
- [ ] Prediction reactions
- [ ] Category CRUD operations
- [ ] Tag CRUD operations
- [ ] Tag-Article associations
- [ ] Prediction creation with categoryId
- [ ] Timeline filtering by tagIds

---

## Questions for Review

1. Should we implement soft delete for Content or hard delete?
2. Do we need migration scripts for existing article tags?
3. Should ContentRepository handle vote counts or delegate to a separate VoteRepository?
4. Do we need separate read/write repositories for Content (CQRS pattern)?
5. Should reactions have metadata (e.g., comment when reacting)?

---

**Generated**: 2025-09-30
**Author**: Claude Code (Automated Repository Normalization)
