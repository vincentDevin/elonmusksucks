# User Posts System Redesign Plan

## Executive Summary

Complete redesign of the user posting system to transform it from a simple profile-only feed to a full-featured social platform with public timeline, reactions, moderation, and advanced privacy controls.

## Current System Analysis

### Existing Components

**Database:**
- `UserPost` model: Basic structure with author, owner, content, parent/children relations
- No reactions, upvotes, or engagement tracking
- No privacy levels or moderation flags
- Simple parent-child comment threading

**Frontend:**
- `ProfileFeed.tsx`: Basic feed display with nested comments
- `CreatePostForm.tsx`: Simple text-only posting
- Timeline shows external articles/tweets, not user posts
- No engagement UI (likes, reactions, shares)

**Backend:**
- Basic CRUD: GET feed, POST to profile
- Owner-only posting restriction
- No privacy controls
- Limited moderation (admin delete only)
- No real-time post updates via Socket.IO

### Critical Gaps

1. **No Public Timeline** - User posts only visible on profiles
2. **No Engagement System** - No likes, reactions, or upvotes
3. **Limited Content Types** - Text only, no media/links/embeds
4. **No Privacy Controls** - All posts are public
5. **Basic Moderation** - No reporting, only admin deletion
6. **No Real-time Updates** - Posts don't update live
7. **No Trending/Discovery** - No algorithm for popular content

## Proposed Architecture

### Database Schema Updates

```prisma
model UserPost {
  id            Int                @id @default(autoincrement())
  author        User               @relation("AuthorToPost", fields: [authorId], references: [id])
  authorId      Int
  
  // Content
  content       String             @db.Text
  contentType   PostContentType    @default(TEXT) // TEXT, IMAGE, LINK, PREDICTION_SHARE
  mediaUrls     Json?              // Array of media URLs
  linkPreview   Json?              // OG tags for link previews
  
  // Privacy & Visibility
  visibility    PostVisibility     @default(PUBLIC) // PUBLIC, PRIVATE, FOLLOWERS
  isDeleted     Boolean            @default(false)
  deletedAt     DateTime?
  deletedBy     Int?               // User ID who deleted (author or admin)
  
  // Engagement Metrics
  likesCount    Int                @default(0)
  commentsCount Int                @default(0)
  sharesCount   Int                @default(0)
  viewsCount    BigInt             @default(0)
  
  // Threading
  parent        UserPost?          @relation("PostParent", fields: [parentId], references: [id])
  parentId      Int?
  children      UserPost[]         @relation("PostParent")
  threadDepth   Int                @default(0) // 0 for root, increments for replies
  
  // Moderation
  reportCount   Int                @default(0)
  isFlagged     Boolean            @default(false)
  moderationNote String?
  
  // Timestamps
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
  editedAt      DateTime?          // Track if post was edited
  
  // Relations
  reactions     PostReaction[]
  reports       PostReport[]
  mentions      PostMention[]
  hashtags      PostHashtag[]
  
  @@index([authorId, visibility, createdAt])
  @@index([visibility, createdAt]) // For public timeline
  @@index([parentId])
}

model PostReaction {
  id         Int       @id @default(autoincrement())
  post       UserPost  @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId     Int
  user       User      @relation(fields: [userId], references: [id])
  userId     Int
  type       ReactionType // LIKE, LOVE, LAUGH, WOW, SAD, ANGRY
  createdAt  DateTime  @default(now())
  
  @@unique([postId, userId, type])
  @@index([postId])
  @@index([userId])
}

model PostReport {
  id         Int       @id @default(autoincrement())
  post       UserPost  @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId     Int
  reporter   User      @relation(fields: [reporterId], references: [id])
  reporterId Int
  reason     ReportReason // SPAM, HARASSMENT, HATE_SPEECH, MISINFORMATION, OTHER
  details    String?
  status     ReportStatus @default(PENDING) // PENDING, REVIEWED, ACTIONED, DISMISSED
  reviewedBy Int?
  reviewNote String?
  createdAt  DateTime  @default(now())
  reviewedAt DateTime?
  
  @@index([postId, status])
  @@index([reporterId])
}

model PostMention {
  id           Int      @id @default(autoincrement())
  post         UserPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId       Int
  mentionedUser User    @relation(fields: [userId], references: [id])
  userId       Int
  startIndex   Int      // Position in content where mention starts
  endIndex     Int      // Position where mention ends
  
  @@index([postId])
  @@index([userId])
}

model PostHashtag {
  id       Int      @id @default(autoincrement())
  post     UserPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId   Int
  hashtag  Hashtag  @relation(fields: [hashtagId], references: [id])
  hashtagId Int
  
  @@unique([postId, hashtagId])
  @@index([hashtagId])
}

model Hashtag {
  id        Int           @id @default(autoincrement())
  tag       String        @unique
  usageCount Int          @default(0)
  posts     PostHashtag[]
  createdAt DateTime      @default(now())
  
  @@index([usageCount])
}

enum PostContentType {
  TEXT
  IMAGE
  LINK
  PREDICTION_SHARE
  POLL
}

enum PostVisibility {
  PUBLIC
  PRIVATE
  FOLLOWERS
  MENTIONED_ONLY
}

enum ReactionType {
  LIKE
  LOVE
  LAUGH
  WOW
  SAD
  ANGRY
}

enum ReportReason {
  SPAM
  HARASSMENT
  HATE_SPEECH
  MISINFORMATION
  INAPPROPRIATE_CONTENT
  COPYRIGHT
  OTHER
}

enum ReportStatus {
  PENDING
  REVIEWED
  ACTIONED
  DISMISSED
}
```

### API Endpoints

#### Posts CRUD
- `GET /api/posts` - Public timeline with filters
- `GET /api/posts/trending` - Trending posts algorithm
- `GET /api/posts/:id` - Single post with full thread
- `POST /api/posts` - Create new post
- `PATCH /api/posts/:id` - Edit post (author only, within 5 mins)
- `DELETE /api/posts/:id` - Soft delete post

#### Engagement
- `POST /api/posts/:id/reactions` - Add reaction
- `DELETE /api/posts/:id/reactions/:type` - Remove reaction
- `GET /api/posts/:id/reactions` - Get all reactions
- `POST /api/posts/:id/share` - Share post

#### Comments
- `GET /api/posts/:id/comments` - Paginated comments
- `POST /api/posts/:id/comments` - Add comment
- `DELETE /api/comments/:id` - Delete comment

#### Moderation
- `POST /api/posts/:id/report` - Report post
- `GET /api/admin/reports` - View all reports (admin)
- `PATCH /api/admin/reports/:id` - Update report status
- `POST /api/admin/posts/:id/flag` - Flag post for review
- `POST /api/admin/posts/:id/remove` - Remove post with reason

#### User Timeline
- `GET /api/users/:id/posts` - User's public posts
- `GET /api/users/:id/timeline` - User's personalized timeline
- `GET /api/users/me/feed` - Authenticated user's feed

### Socket.IO Events

```typescript
// Client → Server
'post:create' - Create new post
'post:delete' - Delete post
'post:edit' - Edit post
'post:react' - Add/remove reaction
'post:report' - Report post
'comment:create' - Add comment
'comment:delete' - Delete comment

// Server → Client  
'post:new' - New post in timeline
'post:updated' - Post edited
'post:deleted' - Post removed
'post:reaction' - Reaction added/removed
'comment:new' - New comment on post
'comment:deleted' - Comment removed
'timeline:update' - Timeline refresh needed
```

### Frontend Components

#### New Components
```
components/posts/
├── PostComposer.tsx        // Rich text editor with media upload
├── PostCard.tsx            // Single post display
├── PostReactions.tsx       // Reaction picker & display
├── PostActions.tsx         // Share, report, delete buttons
├── PostThread.tsx          // Threaded comment view
├── CommentBox.tsx          // Comment input
├── PostTimeline.tsx        // Infinite scroll timeline
├── TrendingPosts.tsx       // Trending algorithm display
├── PostFilters.tsx         // Timeline filter controls
├── PostModerationModal.tsx // Report/flag interface
└── PrivacySelector.tsx     // Post visibility dropdown
```

#### Updated Components
- `Timeline.tsx` - Add "Posts" tab alongside Articles/Tweets
- `ProfileFeed.tsx` - Enhanced with reactions, privacy badges
- `Dashboard.tsx` - Add "Your Posts" widget
- `ActivityFeed.tsx` - Include post interactions

### Implementation Phases

## Phase 1: Database & Core Models (Week 1)
- [ ] Create migration for new schema
- [ ] Update Prisma models
- [ ] Generate types in @ems/types
- [ ] Create seed data for testing

## Phase 2: Basic CRUD & API (Week 1-2)
- [ ] Implement post creation with privacy
- [ ] Add edit/delete endpoints
- [ ] Create timeline endpoint with pagination
- [ ] Add comment threading
- [ ] Implement basic validation

## Phase 3: Engagement System (Week 2)
- [ ] Add reaction endpoints
- [ ] Implement like/unlike logic
- [ ] Create engagement counters
- [ ] Add share functionality
- [ ] Build reaction UI components

## Phase 4: Real-time Updates (Week 3)
- [ ] Add Socket.IO events for posts
- [ ] Implement live timeline updates
- [ ] Add typing indicators for comments
- [ ] Create presence system
- [ ] Build notification system

## Phase 5: Content Enhancement (Week 3-4)
- [ ] Add media upload support
- [ ] Implement link preview fetching
- [ ] Create mention system (@user)
- [ ] Add hashtag support (#topic)
- [ ] Build rich text editor

## Phase 6: Discovery & Algorithm (Week 4)
- [ ] Implement trending algorithm
- [ ] Add chronological vs algorithmic toggle
- [ ] Create recommendation system
- [ ] Build search functionality
- [ ] Add filtering options

## Phase 7: Moderation Tools (Week 5)
- [ ] Create reporting system
- [ ] Build admin moderation panel
- [ ] Add auto-moderation rules
- [ ] Implement shadow banning
- [ ] Create appeal system

## Phase 8: Privacy & Security (Week 5-6)
- [ ] Implement follower-only posts
- [ ] Add block/mute functionality
- [ ] Create post visibility controls
- [ ] Add rate limiting
- [ ] Implement content filtering

## Phase 9: Performance & Polish (Week 6)
- [ ] Add caching layer (Redis)
- [ ] Optimize database queries
- [ ] Implement virtual scrolling
- [ ] Add image optimization
- [ ] Create loading states

## Phase 10: Testing & Launch (Week 7)
- [ ] Write comprehensive tests
- [ ] Load testing
- [ ] Security audit
- [ ] Documentation
- [ ] Gradual rollout

### Technical Considerations

#### Performance
- Implement cursor-based pagination for timelines
- Use Redis for:
  - Timeline caching
  - Engagement counters
  - Trending calculations
  - Rate limiting
- Database indexes on:
  - (visibility, createdAt) for public timeline
  - (authorId, createdAt) for user posts
  - (parentId) for comment threads

#### Security
- Rate limits:
  - 10 posts per hour per user
  - 100 reactions per hour
  - 50 comments per hour
- Content validation:
  - Max 500 chars for posts
  - Max 200 chars for comments
  - 4 images max per post
  - 10MB max file size
- XSS prevention in rich text
- SQL injection protection via Prisma
- CSRF tokens for mutations

#### Scalability
- Horizontal scaling via Redis pub/sub
- CDN for media content
- Background jobs for:
  - Notification delivery
  - Link preview fetching
  - Trending calculations
  - Content moderation
- Database read replicas for timeline queries

### Migration Strategy

1. **Soft Launch** - Enable for subset of users
2. **Parallel Running** - Keep old system while testing
3. **Data Migration** - Move existing UserPost data
4. **Feature Flags** - Gradual feature enablement
5. **Monitoring** - Track performance & errors
6. **Rollback Plan** - Quick revert if issues

### Success Metrics

- **Engagement**: 50% of active users create posts
- **Retention**: 30% weekly post creators
- **Performance**: <200ms timeline load
- **Quality**: <1% posts reported
- **Reach**: Average 10 views per post

### Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Spam/Abuse | High | Rate limits, auto-moderation, reporting |
| Performance degradation | High | Caching, pagination, monitoring |
| Privacy breaches | Critical | Visibility controls, testing, audits |
| Storage costs | Medium | Media limits, compression, CDN |
| Moderation overhead | Medium | Community reporting, AI assistance |

### Dependencies

- **External Services**:
  - Cloudinary/S3 for media storage
  - OpenGraph API for link previews
  - Content moderation API (optional)
  
- **Internal Systems**:
  - Authentication system
  - Notification service
  - Admin panel
  - Redis infrastructure

### Open Questions

1. Should we allow post editing after 5 minutes?
2. How deep should comment threads go? (Currently unlimited)
3. Should deleted posts show [deleted] or disappear completely?
4. Do we want to implement post drafts?
5. Should we add post categories/topics?
6. How should we handle NSFW content?
7. Do we want post scheduling features?
8. Should we add polls as a content type?

## Next Steps

1. Review and approve this plan
2. Create detailed technical specifications
3. Set up development branch
4. Begin Phase 1 implementation
5. Create feature flags for testing