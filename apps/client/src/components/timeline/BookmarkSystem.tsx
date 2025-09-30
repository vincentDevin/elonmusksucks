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
import { useAuth } from '../../contexts/AuthContext';

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
  className?: string;
}

export const BookmarkSystem: React.FC<BookmarkSystemProps> = ({
  contentId,
  contentType = 'article',
  contentTitle,
  variant = 'button',
  onBookmarkChange,
  className = '',
}) => {
  const { user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [showCollectionMenu, setShowCollectionMenu] = useState(false);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'recent' | 'articles' | 'posts'>('all');

  // Check if content is bookmarked
  useEffect(() => {
    if (!contentId || !user) return;

    const checkBookmarkStatus = async () => {
      try {
        const response = await fetch(`/api/bookmarks/check/${contentId}`);
        if (response.ok) {
          const data = await response.json();
          setIsBookmarked(data.isBookmarked);
        }
      } catch (error) {
        console.error('Failed to check bookmark status:', error);
      }
    };

    checkBookmarkStatus();
  }, [contentId, user]);

  // Fetch bookmarks and collections for manager variant
  useEffect(() => {
    if (variant !== 'manager' || !user) return;

    const fetchBookmarksAndCollections = async () => {
      setLoading(true);
      try {
        const [bookmarksRes, collectionsRes] = await Promise.all([
          fetch('/api/bookmarks'),
          fetch('/api/bookmarks/collections'),
        ]);

        if (bookmarksRes.ok) {
          const bookmarksData = await bookmarksRes.json();
          setBookmarks(bookmarksData.bookmarks || []);
        }

        if (collectionsRes.ok) {
          const collectionsData = await collectionsRes.json();
          setCollections(collectionsData.collections || []);
        }
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
      }
    };

    fetchBookmarksAndCollections();
  }, [variant, user]);

  // Toggle bookmark
  const handleToggleBookmark = async () => {
    if (!user || !contentId) return;

    setLoading(true);
    try {
      if (isBookmarked) {
        // Remove bookmark
        const response = await fetch(`/api/bookmarks/${contentId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setIsBookmarked(false);
          onBookmarkChange?.(false);
        }
      } else {
        // Add bookmark
        const response = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentId,
            contentType,
            title: contentTitle,
            collectionId: selectedCollection,
          }),
        });

        if (response.ok) {
          setIsBookmarked(true);
          onBookmarkChange?.(true);
          setShowCollectionMenu(false);
        }
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
      const response = await fetch('/api/bookmarks/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCollectionName }),
      });

      if (response.ok) {
        const newCollection = await response.json();
        setCollections([...collections, newCollection]);
        setNewCollectionName('');
        setShowCreateCollection(false);
        setSelectedCollection(newCollection.id);
      }
    } catch (error) {
      console.error('Failed to create collection:', error);
    }
  };

  // Delete bookmark
  const handleDeleteBookmark = async (bookmarkId: string) => {
    try {
      const response = await fetch(`/api/bookmarks/${bookmarkId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setBookmarks(bookmarks.filter((b) => b.id !== bookmarkId));
      }
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
          onClick={() => (isBookmarked ? handleToggleBookmark() : setShowCollectionMenu(true))}
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
          <div className="absolute z-50 mt-2 bg-surface border border-border rounded-lg shadow-lg min-w-[200px]">
            <div className="p-2 border-b border-border">
              <p className="text-xs font-medium text-tertiary">Save to collection:</p>
            </div>
            <div className="p-2 space-y-1 max-h-[200px] overflow-y-auto">
              <button
                onClick={() => {
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
                  onClick={() => {
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
                onClick={() => setShowCreateCollection(true)}
                className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-hover rounded transition-colors"
              >
                <PlusIcon className="w-4 h-4 inline mr-2" />
                New collection
              </button>
            </div>
            <button
              onClick={() => setShowCollectionMenu(false)}
              className="absolute top-2 right-2 text-tertiary hover:text-content"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Create collection mini-form */}
        {showCreateCollection && (
          <div className="absolute z-50 mt-2 bg-surface border border-border rounded-lg shadow-lg p-3 w-[250px]">
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Collection name..."
              className="w-full px-3 py-2 bg-background border border-border rounded text-sm
                         focus:outline-none focus:border-primary"
              autoFocus
            />
            <div className="flex space-x-2 mt-2">
              <button
                onClick={handleCreateCollection}
                className="flex-1 px-3 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary/90"
              >
                Create
              </button>
              <button
                onClick={() => {
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
            <span>Bookmarks</span>
          </h3>
          <span className="text-xs text-tertiary">{bookmarks.length} saved</span>
        </div>

        {bookmarks.length === 0 ? (
          <p className="text-sm text-tertiary">No bookmarks yet</p>
        ) : (
          <div className="space-y-2">
            {bookmarks.slice(0, 3).map((bookmark) => (
              <div key={bookmark.id} className="text-sm">
                <p className="font-medium text-content truncate">{bookmark.title}</p>
                <p className="text-xs text-tertiary">{formatTimeAgo(bookmark.createdAt)}</p>
              </div>
            ))}
          </div>
        )}

        <button className="w-full mt-3 text-xs text-primary hover:text-primary/80 transition-colors">
          View all bookmarks →
        </button>
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
            className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90
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
                ? 'bg-primary text-white'
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
                              ? 'bg-primary text-white'
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
                className="p-3 bg-muted rounded-lg hover:bg-hover transition-colors group"
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
                    onClick={() => handleDeleteBookmark(bookmark.id)}
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
