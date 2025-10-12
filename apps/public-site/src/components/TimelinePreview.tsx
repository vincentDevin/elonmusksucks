import type { PublicArticle, PublicPostView } from '@ems/types';

interface TimelinePreviewProps {
  articlesData: PublicArticle[] | null;
  postsData: PublicPostView[] | null;
  className?: string;
  clientAppUrl: string;
}

export default function TimelinePreview({
  articlesData,
  postsData,
  className = '',
  clientAppUrl,
}: TimelinePreviewProps) {
  // No fallback data - show empty state if data is missing
  const articles = Array.isArray(articlesData) ? articlesData : [];
  const posts = Array.isArray(postsData) ? postsData : [];

  // Combine and sort by timestamp
  const timelineItems = [
    ...articles.map((article) => ({
      ...article,
      itemType: 'article' as const,
      sortTime: new Date(
        (article as any).timestamp || article.publishedAt || article.createdAt,
      ).getTime(),
    })),
    ...posts.map((post) => ({
      ...post,
      itemType: 'post' as const,
      sortTime: new Date(post.createdAt).getTime(),
    })),
  ]
    .sort((a, b) => b.sortTime - a.sortTime)
    .slice(0, 6);

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(time);
  };

  const renderArticle = (article: any) => {
    const timestamp = article.timestamp || article.publishedAt || article.createdAt;
    return (
      <div
        key={article.id}
        className="flex space-x-3 p-4 border border-border rounded-lg hover:bg-muted/5 transition-colors"
      >
        <div className="text-2xl">📰</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-medium text-info bg-info/10 border border-info/20 px-2 py-1 rounded">
              Article
            </span>
            <span className="text-xs text-tertiary">by {article.content?.author || 'Unknown'}</span>
          </div>
          <h3 className="font-medium text-content text-sm leading-snug mb-2">
            {article.content?.title || article.title}
          </h3>
          <p className="text-xs text-tertiary mb-2 line-clamp-2">
            {article.content?.excerpt || article.excerpt}
          </p>
          <div className="flex items-center space-x-4 text-xs text-tertiary">
            <span>👍 {article.engagement?.reactions || 0}</span>
            <span>💬 {article.engagement?.comments || 0}</span>
            <span>{getRelativeTime(timestamp)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderPost = (post: any) => {
    const avatarUrl = post.author?.avatarUrl || undefined;
    const authorName = post.author?.name || 'Unknown';
    const commentsCount = post.commentsCount || post.repliesCount || 0;
    const reactionsCount = post.reactionsCount || 0;

    return (
      <div
        key={post.id}
        className="flex space-x-3 p-4 border border-border rounded-lg hover:bg-muted/5 transition-colors"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={authorName}
            className="w-8 h-8 rounded-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
            {authorName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-medium text-success bg-success/10 border border-success/20 px-2 py-1 rounded">
              Post
            </span>
            <span className="font-medium text-sm text-content">{authorName}</span>
          </div>
          <p className="text-sm text-content mb-2 line-clamp-2 whitespace-pre-wrap">{post.body}</p>
          <div className="flex items-center space-x-4 text-xs text-tertiary">
            <span>❤️ {reactionsCount}</span>
            <span>💬 {commentsCount}</span>
            {post.sharesCount > 0 && <span>🔄 {post.sharesCount}</span>}
            <span>{getRelativeTime(post.createdAt)}</span>
          </div>
        </div>
      </div>
    );
  };

  if (timelineItems.length === 0) {
    return (
      <div className={`bg-surface rounded-lg p-6 shadow ${className}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-content">📰 Timeline Feed</h2>
        </div>
        <div className="text-center text-tertiary py-8">
          <p>No timeline content to show</p>
          <p className="text-sm mt-2">Check back later for articles and posts!</p>
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <a
            href={`${clientAppUrl}/register`}
            className="block w-full text-center px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover transition-colors text-sm font-medium"
          >
            Join the conversation!
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-surface rounded-lg p-6 shadow ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-content">📰 Timeline Feed</h2>
        <a href="/timeline" className="text-primary hover:underline text-sm font-medium">
          View all →
        </a>
      </div>

      <div className="space-y-3">
        {timelineItems.map((item) =>
          item.itemType === 'article' ? renderArticle(item) : renderPost(item),
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <a
          href={`${clientAppUrl}/register`}
          className="block w-full text-center px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover transition-colors text-sm font-medium"
        >
          Join the conversation!
        </a>
      </div>
    </div>
  );
}
