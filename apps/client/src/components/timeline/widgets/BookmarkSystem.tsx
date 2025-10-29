import React, { useState, useEffect } from 'react';
import {
  BookmarkIcon,
  FolderIcon,
  FolderPlusIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  ClockIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkIconSolid } from '@heroicons/react/24/solid';
import { useAuth } from '../../../contexts/AuthContext';
import { useBookmarks } from '../../../contexts/BookmarkContext';
import { timelineApi } from '../../../api/timeline';

interface Bookmark {
  id: string;
  contentId: string;
  contentType: 'article' | 'post' | 'prediction';
  title: string;
  excerpt?: string;
  url?: string;
  author?: {
    id: string;
    name: string;
  };
  collectionId?: string;
  tags?: string[];
  createdAt: string;
  notes?: string;
}

interface Collection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  bookmarkCount: number;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BookmarkSystemProps {
  contentId?: string;
  contentType?: 'article' | 'post' | 'prediction';
  contentTitle?: string;
  variant?: 'button' | 'manager' | 'widget';
  onBookmarkChange?: (isBookmarked: boolean) => void;
  onBookmarkClick?: (articleId: number) => void;
  className?: string;
  isExpanded?: boolean;
}

export const BookmarkSystem: React.FC<BookmarkSystemProps> = ({
  contentId,
  contentType: _contentType = 'article', // Available for future use
  contentTitle: _contentTitle, // Available for future use
  variant = 'button',
  onBookmarkChange,
  onBookmarkClick,
  className = '',
  isExpanded = true, // Default to true for backwards compatibility
}) => {
  const { user } = useAuth();
  const { isBookmarked: checkIsBookmarked, requestBookmarkCheck, setBookmarked } = useBookmarks();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [showCollectionMenu, setShowCollectionMenu] = useState(false);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [filter, setFilter] = useState<'all' | 'recent' | 'articles' | 'posts'>('all');

  // Extract numeric article ID for batched bookmark checking
  const numericId = React.useMemo(() => {
    if (!contentId) return null;

    // Skip posts (only articles can be bookmarked)
    if (String(contentId).startsWith('post-')) {
      return null;
    }

    const id =
      typeof contentId === 'number'
        ? contentId
        : parseInt(String(contentId).replace('article-', ''));

    return isNaN(id) ? null : id;
  }, [contentId]);

  // Request bookmark check using batched context
  useEffect(() => {
    if (!numericId || !user) return;
    requestBookmarkCheck(numericId);
  }, [numericId, user, requestBookmarkCheck]);

  // Get bookmark status from context
  const isBookmarked = numericId ? (checkIsBookmarked(numericId) ?? false) : false;

  // Fetch bookmarks and collections for manager and widget variants
  useEffect(() => {
    // Lazy load: Only fetch when expanded and not yet hydrated
    if (!isExpanded || hasHydrated) return;
    if ((variant !== 'manager' && variant !== 'widget') || !user) return;

    const fetchBookmarksAndCollections = async () => {
      setLoading(true);
      try {
        const [bookmarksData, collectionsData] = await Promise.all([
          timelineApi.getBookmarks(),
          timelineApi.getBookmarkCollections(),
        ]);

        // Transform backend bookmarks to frontend interface
        const transformedBookmarks = (bookmarksData.bookmarks || []).map((bm: any) => ({
          id: String(bm.id),
          contentId: String(bm.article.id),
          contentType: 'article' as const,
          title: bm.article.title,
          excerpt: bm.article.excerpt || undefined,
          url: bm.article.url,
          author: bm.article.feed
            ? { id: String(bm.article.feed.id), name: bm.article.feed.name }
            : undefined,
          collectionId: bm.collectionId ? String(bm.collectionId) : undefined,
          tags: bm.article.tags?.map((at: any) => at.tag?.name).filter(Boolean) || [],
          createdAt: new Date(bm.createdAt).toISOString(),
        }));

        setBookmarks(transformedBookmarks);

        // Transform collections to match local interface (convert _count to bookmarkCount)
        const transformedCollections = (collectionsData.collections || []).map((col) => ({
          id: String(col.id),
          name: col.name,
          description: col.description || undefined,
          bookmarkCount: col._count.bookmarks,
          isPrivate: col.isPrivate,
          createdAt: col.createdAt,
          updatedAt: col.updatedAt,
        }));
        setCollections(transformedCollections);
      } catch (error) {
        console.error('Failed to fetch bookmarks:', error);
        // Mock data for development
        setBookmarks([
          {
            id: '1',
            contentId: 'article-1',
            contentType: 'article',
            title: 'Understanding Prediction Markets',
            excerpt: 'A comprehensive guide to how prediction markets work...',
            author: { id: '1', name: 'Alice Smith' },
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            tags: ['education', 'markets'],
          },
          {
            id: '2',
            contentId: 'post-1',
            contentType: 'post',
            title: 'My prediction strategy for Q4',
            author: { id: '2', name: 'Bob Johnson' },
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            tags: ['strategy'],
          },
        ]);
        setCollections([
          {
            id: '1',
            name: 'Learning Resources',
            description: 'Educational content about predictions',
            color: '#3B82F6',
            bookmarkCount: 12,
            isPrivate: false,
            createdAt: new Date(Date.now() - 604800000).toISOString(),
            updatedAt: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: '2',
            name: 'Market Analysis',
            description: 'Important market insights',
            color: '#10B981',
            bookmarkCount: 8,
            isPrivate: true,
            createdAt: new Date(Date.now() - 1209600000).toISOString(),
            updatedAt: new Date(Date.now() - 172800000).toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
        setHasHydrated(true);
      }
    };

    fetchBookmarksAndCollections();
  }, [variant, user, isExpanded, hasHydrated]);

  // Toggle bookmark
  const handleToggleBookmark = async () => {
    if (!user || !numericId) return;

    setLoading(true);
    try {
      const result = await timelineApi.toggleBookmark(
        numericId,
        selectedCollection ? parseInt(selectedCollection) : undefined,
      );

      const newBookmarkState = result.action === 'added';

      // Update bookmark context
      setBookmarked(numericId, newBookmarkState);

      onBookmarkChange?.(newBookmarkState);
      if (newBookmarkState) {
        setShowCollectionMenu(false);
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create new collection
  const handleCreateCollection = async () => {
    if (!newCollectionName.trim() || !user) return;

    try {
      const newCollection = await timelineApi.createBookmarkCollection({
        name: newCollectionName.trim(),
      });

      // Transform the new collection to match local interface
      const transformedCollection: Collection = {
        id: String(newCollection.id),
        name: newCollection.name,
        description: newCollection.description || undefined,
        bookmarkCount: newCollection._count.bookmarks,
        isPrivate: newCollection.isPrivate,
        createdAt: newCollection.createdAt,
        updatedAt: newCollection.updatedAt,
      };

      setCollections([...collections, transformedCollection]);
      setNewCollectionName('');
      setShowCreateCollection(false);
      setSelectedCollection(String(newCollection.id));
    } catch (error) {
      console.error('Failed to create collection:', error);
    }
  };

  // Delete bookmark
  const handleDeleteBookmark = async (bookmarkId: string) => {
    try {
      // Find the bookmark to get the articleId
      const bookmark = bookmarks.find((b) => b.id === bookmarkId);
      if (!bookmark) return;

      // Toggle the bookmark (which will remove it since it's already bookmarked)
      await timelineApi.toggleBookmark(parseInt(bookmark.contentId));

      // Remove from local state
      setBookmarks(bookmarks.filter((b) => b.id !== bookmarkId));
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
    }
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = now - time;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  // Filter bookmarks
  const getFilteredBookmarks = () => {
    let filtered = [...bookmarks];

    if (selectedCollection) {
      filtered = filtered.filter((b) => b.collectionId === selectedCollection);
    }

    switch (filter) {
      case 'recent':
        return filtered.slice(0, 10);
      case 'articles':
        return filtered.filter((b) => b.contentType === 'article');
      case 'posts':
        return filtered.filter((b) => b.contentType === 'post');
      default:
        return filtered;
    }
  };

  // Render button variant
  if (variant === 'button') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent event bubbling to parent card
            if (isBookmarked) {
              handleToggleBookmark();
            } else {
              setShowCollectionMenu(true);
            }
          }}
          disabled={loading || !user}
          className={`p-2 rounded-lg transition-colors ${
            isBookmarked ? 'text-primary hover:text-error' : 'text-tertiary hover:text-primary'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
        >
          {isBookmarked ? (
            <BookmarkIconSolid className="w-5 h-5" />
          ) : (
            <BookmarkIcon className="w-5 h-5" />
          )}
        </button>

        {/* Collection selection menu */}
        {showCollectionMenu && !isBookmarked && (
          <div
            className="absolute z-50 mt-2 bg-surface border border-border rounded-lg shadow-lg min-w-[200px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 border-b border-border">
              <p className="text-xs font-medium text-tertiary">Save to collection:</p>
            </div>
            <div className="p-2 space-y-1 max-h-[200px] overflow-y-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCollection(null);
                  handleToggleBookmark();
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-hover rounded transition-colors"
              >
                <FolderIcon className="w-4 h-4 inline mr-2 text-tertiary" />
                Uncategorized
              </button>
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCollection(collection.id);
                    handleToggleBookmark();
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-hover rounded transition-colors"
                >
                  <div
                    className="w-4 h-4 rounded inline-block mr-2"
                    style={{ backgroundColor: collection.color || '#6B7280' }}
                  />
                  {collection.name}
                </button>
              ))}
            </div>
            <div className="p-2 border-t border-border">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateCollection(true);
                }}
                className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-hover rounded transition-colors"
              >
                <PlusIcon className="w-4 h-4 inline mr-2" />
                New collection
              </button>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCollectionMenu(false);
              }}
              className="absolute top-2 right-2 text-tertiary hover:text-content"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Create collection mini-form */}
        {showCreateCollection && (
          <div
            className="absolute z-50 mt-2 bg-surface border border-border rounded-lg shadow-lg p-3 w-[250px]"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Collection name..."
              className="w-full px-3 py-2 bg-background border border-border rounded text-sm
                         focus:outline-none focus:border-primary"
              autoFocus
            />
            <div className="flex space-x-2 mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateCollection();
                }}
                className="flex-1 px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90"
              >
                Create
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateCollection(false);
                  setNewCollectionName('');
                }}
                className="flex-1 px-3 py-1.5 bg-muted text-content text-sm rounded hover:bg-hover"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render widget variant
  if (variant === 'widget') {
    return (
      <div className={`bg-surface rounded-lg p-4 shadow ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-content flex items-center space-x-2">
            <BookmarkIcon className="w-5 h-5" />
            <span>Bookmarks {bookmarks.length > 0 && `(${bookmarks.length})`}</span>
          </h3>
        </div>

        {isExpanded && (
          <>
            {bookmarks.length === 0 ? (
              <p className="text-sm text-tertiary">No bookmarks yet</p>
            ) : (
              <div className="space-y-2">
                {bookmarks.slice(0, 3).map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="text-sm p-2 rounded hover:bg-hover transition-colors cursor-pointer"
                    onClick={() => {
                      const articleId = parseInt(bookmark.contentId);
                      if (!isNaN(articleId) && onBookmarkClick) {
                        onBookmarkClick(articleId);
                      }
                    }}
                  >
                    <p className="font-medium text-content truncate">{bookmark.title}</p>
                    <p className="text-xs text-tertiary">{formatTimeAgo(bookmark.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}

            <button className="w-full mt-3 text-xs text-primary hover:text-primary/80 transition-colors">
              View all bookmarks →
            </button>
          </>
        )}
      </div>
    );
  }

  // Render manager variant
  const filteredBookmarks = getFilteredBookmarks();

  return (
    <div className={`bg-surface rounded-lg shadow ${className}`}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-content">Bookmarks Manager</h2>
          <button
            onClick={() => setShowCreateCollection(true)}
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90
                       flex items-center space-x-1"
          >
            <FolderPlusIcon className="w-4 h-4" />
            <span>New Collection</span>
          </button>
        </div>

        {/* Collections */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCollection(null)}
            className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-colors ${
              !selectedCollection
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-tertiary hover:bg-hover'
            }`}
          >
            All ({bookmarks.length})
          </button>
          {collections.map((collection) => (
            <button
              key={collection.id}
              onClick={() => setSelectedCollection(collection.id)}
              className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-colors
                          flex items-center space-x-1 ${
                            selectedCollection === collection.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-tertiary hover:bg-hover'
                          }`}
            >
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: collection.color || '#6B7280' }}
              />
              <span>
                {collection.name} ({collection.bookmarkCount})
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex space-x-1 mt-3">
          {(['all', 'recent', 'articles', 'posts'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                filter === f ? 'bg-primary/10 text-primary' : 'text-tertiary hover:bg-hover'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Bookmark list */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : filteredBookmarks.length === 0 ? (
          <div className="text-center py-8 text-tertiary">
            <BookmarkIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No bookmarks found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="p-3 bg-muted rounded-lg hover:bg-hover transition-colors group cursor-pointer"
                onClick={() => {
                  // Extract article ID from contentId
                  const articleId = parseInt(bookmark.contentId);
                  if (!isNaN(articleId) && onBookmarkClick) {
                    onBookmarkClick(articleId);
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 mr-2">
                    <h4 className="font-medium text-content truncate">{bookmark.title}</h4>
                    {bookmark.excerpt && (
                      <p className="text-sm text-tertiary mt-1 line-clamp-2">{bookmark.excerpt}</p>
                    )}
                    <div className="flex items-center space-x-3 mt-2 text-xs text-tertiary">
                      {bookmark.author && <span>By {bookmark.author.name}</span>}
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <ClockIcon className="w-3 h-3" />
                        <span>{formatTimeAgo(bookmark.createdAt)}</span>
                      </span>
                      {bookmark.tags && bookmark.tags.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            <TagIcon className="w-3 h-3" />
                            {bookmark.tags.map((tag) => (
                              <span key={tag} className="text-primary">
                                #{tag}
                              </span>
                            ))}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click
                      handleDeleteBookmark(bookmark.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1
                               text-tertiary hover:text-error"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookmarkSystem;
