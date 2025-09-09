import type { ServerData } from '../types';

export default function TimelinePage({ articlesData, postsData, clientAppUrl }: ServerData) {
  const articles = Array.isArray(articlesData) ? articlesData : [];
  const posts = Array.isArray(postsData) ? postsData : [];

  // Combine and sort by timestamp
  const timelineItems = [
    ...articles.map((article) => ({
      ...article,
      itemType: 'article' as const,
      sortTime: new Date(article.timestamp).getTime(),
    })),
    ...posts.map((post) => ({
      ...post,
      itemType: 'post' as const,
      sortTime: new Date(post.createdAt).getTime(),
    })),
  ].sort((a, b) => b.sortTime - a.sortTime);

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(time);
  };

  const renderArticle = (article: any) => (
    <article
      key={article.id}
      className="bg-surface rounded-lg p-6 shadow hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start space-x-4">
        {article.content.imageUrl && (
          <div className="flex-shrink-0">
            <img
              src={article.content.imageUrl}
              alt={article.content.title}
              className="w-24 h-24 object-cover rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-2xl">📰</span>
            <span className="text-xs font-medium text-info bg-info/10 border border-info/20 px-2 py-1 rounded">
              Article
            </span>
            <span className="text-xs text-tertiary">
              {article.content.source} • {getRelativeTime(article.timestamp)}
            </span>
          </div>

          <h2 className="text-xl font-bold text-content mb-3 leading-tight">
            {article.content.title}
          </h2>

          <p className="text-tertiary mb-4 leading-relaxed">{article.content.excerpt}</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-tertiary">
              <span className="flex items-center space-x-1">
                <span>👍</span>
                <span>{article.engagement.reactions}</span>
              </span>
              <span className="flex items-center space-x-1">
                <span>💬</span>
                <span>{article.engagement.comments}</span>
              </span>
            </div>

            <div className="flex space-x-2">
              <a
                href={article.content.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 text-xs bg-primary text-white rounded hover:bg-primary-hover transition-colors"
              >
                Read Full Article
              </a>
              <a
                href={`${clientAppUrl}/login`}
                className="px-3 py-1 text-xs border border-border text-content rounded hover:bg-muted/20 transition-colors"
              >
                React & Comment
              </a>
            </div>
          </div>
        </div>
      </div>
    </article>
  );

  const renderPost = (post: any) => (
    <article
      key={post.id}
      className="bg-surface rounded-lg p-6 shadow hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start space-x-4">
        <img
          src={post.authorAvatar}
          alt={post.authorName}
          className="w-12 h-12 rounded-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://i.pravatar.cc/150?img=1';
          }}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xs font-medium text-success bg-success/10 border border-success/20 px-2 py-1 rounded">
              Community Post
            </span>
            <span className="font-medium text-content">{post.authorName}</span>
            <span className="text-xs text-tertiary">{getRelativeTime(post.createdAt)}</span>
          </div>

          <div className="text-content mb-4 leading-relaxed">{post.content}</div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-tertiary">
              <span className="flex items-center space-x-1">
                <span>❤️</span>
                <span>{post.likesCount}</span>
              </span>
              <span className="flex items-center space-x-1">
                <span>💬</span>
                <span>{post.commentsCount}</span>
              </span>
              <span className="flex items-center space-x-1">
                <span>🔄</span>
                <span>{post.sharesCount}</span>
              </span>
              <span className="flex items-center space-x-1">
                <span>👀</span>
                <span>{post.viewsCount}</span>
              </span>
            </div>

            <a
              href={`${clientAppUrl}/login`}
              className="px-3 py-1 text-xs border border-border text-content rounded hover:bg-muted/20 transition-colors"
            >
              Join Conversation
            </a>
          </div>
        </div>
      </div>
    </article>
  );

  return (
    <div className="bg-background text-content min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-surface rounded-lg p-8 mb-8 shadow">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold mb-4">📈 Live Timeline</h1>
            <p className="text-xl text-content/80 mb-2">
              Track the latest Musk news and community reactions
            </p>
            <p className="text-lg text-content/70 mb-6">
              Stay updated with articles, tweets, and community insights
            </p>

            <div className="flex justify-center space-x-4">
              <a
                href={`${clientAppUrl}/login`}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover font-semibold transition-colors"
              >
                Join the Discussion
              </a>
              <a
                href={`${clientAppUrl}/register`}
                className="px-6 py-3 bg-surface border border-border text-content rounded-lg hover:bg-muted/20 font-semibold transition-colors"
              >
                Create Account
              </a>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-surface rounded-lg p-4 shadow">
            <div className="text-3xl font-bold text-info">{articles.length}</div>
            <div className="text-sm text-tertiary">Latest Articles</div>
          </div>
          <div className="bg-surface rounded-lg p-4 shadow">
            <div className="text-3xl font-bold text-success">{posts.length}</div>
            <div className="text-sm text-tertiary">Community Posts</div>
          </div>
          <div className="bg-surface rounded-lg p-4 shadow">
            <div className="text-3xl font-bold text-secondary">{timelineItems.length}</div>
            <div className="text-sm text-tertiary">Total Updates</div>
          </div>
        </div>

        {/* Timeline Feed */}
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Recent Updates</h2>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <span className="text-sm text-tertiary">Live Feed</span>
            </div>
          </div>

          {timelineItems.length === 0 ? (
            <div className="bg-surface rounded-lg p-12 text-center">
              <div className="text-6xl mb-4">📡</div>
              <h3 className="text-xl font-semibold mb-2">No updates yet</h3>
              <p className="text-tertiary">Check back soon for the latest Musk chaos!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {timelineItems
                .slice(0, 20)
                .map((item) =>
                  item.itemType === 'article' ? renderArticle(item) : renderPost(item),
                )}

              {timelineItems.length > 20 && (
                <div className="bg-surface rounded-lg p-8 text-center">
                  <p className="text-tertiary mb-4">
                    Showing latest 20 updates. Join to see more and participate!
                  </p>
                  <a
                    href={`${clientAppUrl}/register`}
                    className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover font-semibold transition-colors"
                  >
                    Join the Community
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="bg-surface rounded-lg p-8 text-center shadow mt-12">
          <h2 className="text-2xl font-bold mb-4">Stay in the Loop</h2>
          <p className="text-tertiary mb-6">
            Join thousands following Elon's every move and making predictions
          </p>
          <div className="flex justify-center space-x-4">
            <a
              href={`${clientAppUrl}/register`}
              className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover font-semibold text-lg transition-colors"
            >
              Join Now
            </a>
            <a
              href="/predictions"
              className="px-8 py-3 bg-surface border border-border text-content rounded-lg hover:bg-muted/20 font-semibold text-lg transition-colors"
            >
              View Predictions
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
