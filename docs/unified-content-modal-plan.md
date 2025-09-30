# Unified Content Modal System - Implementation Plan

## 🎯 Objective

Replace separate content viewing experiences (ArticleDrawer, individual post modals) with a single **UnifiedContentModal** that handles both articles and posts using existing database schema and services.

## 🏗️ Current State Analysis

### Existing Data Architecture (Keep As-Is)
```sql
-- Article reactions (string type field)
ArticleReaction { articleId, userId, type: "like"|"dislike"|"love"|"laugh"|"angry" }

-- Post reactions (enum type field)
PostReaction { postId, userId, type: LIKE|LOVE|LAUGH|WOW|SAD|ANGRY }

-- Article comments (flat structure)
ArticleComment { articleId, userId, content, createdAt, updatedAt }

-- Post comments (threaded via UserPost)
UserPost { parentId, children[], threadDepth, content, authorId }

-- Emoji usage tracking
UserEmojiUsage { userId, emoji, useCount, lastUsedAt }
```

### Existing Services (Leverage These)
- **PostReactionService**: Toggle reactions on posts with Redis events
- **ArticleReactionService**: Toggle reactions on articles
- **MessageService**: Emoji extraction and EMOJI_USED events
- **EventBusCore**: 75+ Redis channels for real-time updates
- **feedAdapter**: UnifiedFeedItem conversion for GenericFeed

## 🎨 Unified User Experience

### Before (Inconsistent)
```
Article Card → ArticleDrawer (custom modal)
Post Card → PostCard expand (inline)
```

### After (Unified)
```
Article Card → UnifiedContentModal (consistent experience)
Post Card → UnifiedContentModal (consistent experience)
```

## 🔧 Implementation Strategy

### Phase 1: Component Architecture
Create unified modal that **delegates** to existing systems:

```typescript
UnifiedContentModal
├── ArticleModalContent (for articles)
├── PostModalContent (for posts)
├── UnifiedReactions (delegates to existing services)
└── UnifiedComments (delegates to existing services)
```

### Phase 2: Service Integration
Extend existing APIs with unified endpoints that route to current services:

```typescript
// New unified endpoints that delegate
POST /api/unified/reactions → routes to existing article/post reaction services
GET  /api/unified/comments → routes to existing article/post comment services
```

### Phase 3: Event System Extension
Use existing Redis channels with additional metadata:

```typescript
// Existing channels work for both content types
REDIS_CHANNELS.EMOJI_USED: { userId, emoji, contentType, contentId }
REDIS_CHANNELS.ACTIVITY_GLOBAL: { type: 'reaction_added', contentType, contentId }
```

## 📋 Detailed Implementation Plan

### Phase 1: Core Components (Week 1)

#### 1.1 UnifiedContentModal Component
```typescript
interface UnifiedContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: UnifiedFeedItem; // From existing feedAdapter
}

// Single modal that renders different content types
const UnifiedContentModal = ({ content, isOpen, onClose }) => {
  const contentType = content.type; // 'article' | 'post'
  const contentData = content.originalData;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="lg">
      {/* Content renderer based on type */}
      {contentType === 'article' ? (
        <ArticleModalContent article={contentData} />
      ) : (
        <PostModalContent post={contentData} />
      )}

      {/* Unified interaction components */}
      <UnifiedReactions
        contentType={contentType}
        contentId={parseInt(content.id)}
      />

      <UnifiedComments
        contentType={contentType}
        contentId={parseInt(content.id)}
      />

      <UnifiedActionBar
        contentType={contentType}
        content={contentData}
      />
    </BaseModal>
  );
};
```

#### 1.2 Content Renderers
```typescript
// Article content display (replaces ArticleDrawer content)
const ArticleModalContent = ({ article }: { article: TimelineItem }) => (
  <div>
    <img src={article.content?.imageUrl} className="w-full rounded-lg mb-4" />
    <h1 className="text-2xl font-bold mb-2">{article.content?.title}</h1>
    <div className="text-content/60 mb-4">
      {article.content?.author} • {formatDate(article.timestamp)}
    </div>
    <p className="text-content/80 leading-relaxed">{article.content?.excerpt}</p>
    {/* Tags, source links, etc. */}
  </div>
);

// Post content display (enhanced PostCard content)
const PostModalContent = ({ post }: { post: UserFeedPost }) => (
  <div>
    <div className="flex items-center space-x-3 mb-4">
      <img src={post.user.avatarUrl} className="w-10 h-10 rounded-full" />
      <div>
        <div className="font-medium">{post.user.name}</div>
        <div className="text-content/60 text-sm">{formatTimeAgo(post.createdAt)}</div>
      </div>
    </div>
    <p className="text-content leading-relaxed mb-4">{post.content}</p>
    {/* Media, link previews, etc. */}
  </div>
);
```

#### 1.3 Unified Reactions Component
```typescript
const UnifiedReactions = ({ contentType, contentId }) => {
  // Use existing hooks but with unified interface
  const articleReactions = useArticleReactions(
    contentType === 'article' ? contentId : null
  );
  const postReactions = useReactions(
    contentType === 'post' ? contentId : null
  );

  const reactions = contentType === 'article' ? articleReactions : postReactions;

  return (
    <div className="flex items-center space-x-2 py-3 border-t border-border">
      {Object.entries(ReactionTypes).map(([key, value]) => (
        <ReactionButton
          key={key}
          type={value}
          count={reactions.counts[value]}
          isActive={reactions.userReaction === value}
          onClick={() => reactions.toggleReaction(value)}
        />
      ))}
    </div>
  );
};
```

### Phase 2: Service Layer Extension (Week 2)

#### 2.1 Unified API Endpoints
```typescript
// Add new endpoints that delegate to existing services
app.post('/api/unified/reactions', async (req, res) => {
  const { contentType, contentId, reactionType } = req.body;

  if (contentType === 'article') {
    // Route to existing article reaction service
    req.params.articleId = contentId;
    req.body.type = reactionType;
    return articleReactionController.toggle(req, res);
  } else {
    // Route to existing post reaction service
    req.params.postId = contentId;
    req.body.type = reactionType;
    return postReactionController.toggle(req, res);
  }
});

app.get('/api/unified/comments/:contentType/:contentId', async (req, res) => {
  const { contentType, contentId } = req.params;

  if (contentType === 'article') {
    req.params.articleId = contentId;
    return articleCommentController.getComments(req, res);
  } else {
    req.params.postId = contentId;
    return postController.getReplies(req, res);
  }
});
```

#### 2.2 Unified Comment System
```typescript
const UnifiedComments = ({ contentType, contentId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    // Fetch comments using unified endpoint
    fetchUnifiedComments(contentType, contentId).then(setComments);
  }, [contentType, contentId]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment = await submitUnifiedComment(contentType, contentId, newComment);
    setComments(prev => [comment, ...prev]);
    setNewComment('');
  };

  return (
    <div className="border-t border-border pt-4">
      <h3 className="font-semibold mb-4">Comments ({comments.length})</h3>

      {/* Comment form */}
      <form onSubmit={handleSubmitComment} className="mb-4">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full p-3 border border-muted rounded-lg"
          rows={3}
        />
        <button
          type="submit"
          disabled={!newComment.trim()}
          className="mt-2 px-4 py-2 bg-primary text-white rounded-lg"
        >
          Post Comment
        </button>
      </form>

      {/* Comments list */}
      <div className="space-y-4">
        {comments.map(comment => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>
    </div>
  );
};
```

### Phase 3: Integration & Replacement (Week 3)

#### 3.1 Replace ArticleDrawer Usage
```typescript
// In TimelineWithPosts.tsx - replace ArticleDrawer
const handleViewDetails = (item: TimelineItem) => {
  setSelectedContent(convertToUnifiedItem(item, 'article'));
  setShowUnifiedModal(true);
};

// Remove ArticleDrawer, add UnifiedContentModal
{showUnifiedModal && selectedContent && (
  <UnifiedContentModal
    content={selectedContent}
    isOpen={showUnifiedModal}
    onClose={() => setShowUnifiedModal(false)}
  />
)}
```

#### 3.2 Integrate with PostCard
```typescript
// Add click handler to PostCard for modal expansion
const PostCard = ({ post, onExpand, ...props }) => {
  return (
    <BaseCard
      onClick={() => onExpand?.(post)}
      // ... existing PostCard props
    >
      {/* Existing PostCard content */}
    </BaseCard>
  );
};

// In TimelineWithPosts - handle post expansion
const handlePostExpand = (post: UserFeedPost) => {
  setSelectedContent(convertToUnifiedItem(post, 'post'));
  setShowUnifiedModal(true);
};
```

## 🚀 Benefits

### User Experience
- **Consistent interaction** patterns for all content types
- **Single modal system** instead of multiple drawers/modals
- **Unified reactions** - same emoji reactions for articles and posts
- **Better mobile experience** - single modal works better than separate drawers

### Developer Experience
- **Zero breaking changes** - all existing functionality preserved
- **Leverage existing infrastructure** - uses current reaction/emoji systems
- **Gradual migration** - can implement piece by piece
- **Reduced maintenance** - one modal component instead of multiple

### Technical Benefits
- **Preserves data integrity** - no schema changes required
- **Uses existing APIs** - delegates to current services
- **Leverages Redis events** - existing 75+ channels work unchanged
- **Maintains performance** - no additional database queries

## 📊 Success Metrics

- **Code reduction**: Eliminate ArticleDrawer component (~400 lines)
- **Consistency**: Single interaction pattern for all content types
- **Performance**: No additional API calls or database queries
- **User satisfaction**: Unified experience across content types

## 🎯 Next Steps

1. **Phase 1**: Create UnifiedContentModal component with content renderers
2. **Phase 2**: Add unified reaction and comment components
3. **Phase 3**: Replace ArticleDrawer usage and integrate with PostCard
4. **Phase 4**: Remove deprecated components and optimize

This plan leverages your existing sophisticated schema and services while providing the unified experience you want, without any breaking changes or data migrations.