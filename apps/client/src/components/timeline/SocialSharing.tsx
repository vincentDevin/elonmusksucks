import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ShareIcon,
  LinkIcon,
  EnvelopeIcon,
  CheckIcon,
  XMarkIcon,
  ChatBubbleOvalLeftIcon,
  UserGroupIcon,
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

interface ShareContent {
  id: string;
  title: string;
  description?: string;
  url: string;
  type: 'article' | 'post' | 'prediction';
  author?: {
    id: string;
    name: string;
  };
}

interface InternalShareTarget {
  id: string;
  type: 'user' | 'group' | 'channel';
  name: string;
  avatar?: string;
}

interface SocialSharingProps {
  content: ShareContent;
  variant?: 'button' | 'menu' | 'inline';
  showStats?: boolean;
  onShare?: (platform: string) => void;
  className?: string;
}

export const SocialSharing: React.FC<SocialSharingProps> = ({
  content,
  variant = 'button',
  showStats = false,
  onShare,
  className = '',
}) => {
  const { user } = useAuth();
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showInternalShare, setShowInternalShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareStats, setShareStats] = useState({ total: 0, external: 0, internal: 0 });
  const [internalTargets, setInternalTargets] = useState<InternalShareTarget[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [shareMessage, setShareMessage] = useState('');
  const [sending, setSending] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  // Social media share configurations
  const shareOptions = [
    {
      name: 'Twitter/X',
      icon: '𝕏',
      action: () => shareToTwitter(),
      color: 'hover:bg-black hover:text-white',
    },
    {
      name: 'Facebook',
      icon: 'f',
      action: () => shareToFacebook(),
      color: 'hover:bg-blue-600 hover:text-white',
    },
    {
      name: 'LinkedIn',
      icon: 'in',
      action: () => shareToLinkedIn(),
      color: 'hover:bg-blue-700 hover:text-white',
    },
    {
      name: 'Reddit',
      icon: 'R',
      action: () => shareToReddit(),
      color: 'hover:bg-orange-600 hover:text-white',
    },
    {
      name: 'Email',
      icon: <EnvelopeIcon className="w-5 h-5" />,
      action: () => shareViaEmail(),
      color: 'hover:bg-gray-600 hover:text-white',
    },
  ];

  // Fetch share statistics
  useEffect(() => {
    if (showStats && content.id) {
      const fetchShareStats = async () => {
        try {
          const response = await fetch(`/api/content/${content.id}/share-stats`);
          if (response.ok) {
            const data = await response.json();
            setShareStats(data);
          }
        } catch (error) {
          console.error('Failed to fetch share stats:', error);
          // Mock data
          setShareStats({ total: 45, external: 32, internal: 13 });
        }
      };

      fetchShareStats();
    }
  }, [showStats, content.id]);

  // Fetch internal share targets
  useEffect(() => {
    if (showInternalShare && user) {
      const fetchTargets = async () => {
        try {
          const response = await fetch('/api/users/share-targets');
          if (response.ok) {
            const data = await response.json();
            setInternalTargets(data.targets || []);
          }
        } catch (error) {
          console.error('Failed to fetch share targets:', error);
          // Mock data
          setInternalTargets([
            { id: '1', type: 'user', name: 'Alice Smith' },
            { id: '2', type: 'user', name: 'Bob Johnson' },
            { id: '3', type: 'group', name: 'Prediction Enthusiasts' },
            { id: '4', type: 'channel', name: '#general' },
          ]);
        }
      };

      fetchTargets();
    }
  }, [showInternalShare, user]);

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
        setShowInternalShare(false);
      }
    };

    if (showShareMenu || showInternalShare) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showShareMenu, showInternalShare]);

  // Share functions
  const shareToTwitter = () => {
    const text = `${content.title} ${content.url}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'width=550,height=420');
    trackShare('twitter');
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(content.url)}`;
    window.open(url, '_blank', 'width=550,height=420');
    trackShare('facebook');
  };

  const shareToLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(content.url)}`;
    window.open(url, '_blank', 'width=550,height=520');
    trackShare('linkedin');
  };

  const shareToReddit = () => {
    const url = `https://reddit.com/submit?url=${encodeURIComponent(content.url)}&title=${encodeURIComponent(content.title)}`;
    window.open(url, '_blank', 'width=850,height=550');
    trackShare('reddit');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(content.title);
    const body = encodeURIComponent(
      `Check out this content: ${content.title}\n\n${content.description || ''}\n\n${content.url}`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    trackShare('email');
  };

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      trackShare('copy');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [content.url]);

  const trackShare = async (platform: string) => {
    try {
      await fetch('/api/content/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: content.id,
          platform,
          type: 'external',
        }),
      });
    } catch (error) {
      console.error('Failed to track share:', error);
    }
    onShare?.(platform);
    setShowShareMenu(false);
  };

  const handleInternalShare = async () => {
    if (selectedTargets.length === 0 || !user) return;

    setSending(true);
    try {
      const response = await fetch('/api/content/share/internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: content.id,
          targets: selectedTargets,
          message: shareMessage,
        }),
      });

      if (response.ok) {
        setShowInternalShare(false);
        setSelectedTargets([]);
        setShareMessage('');
        onShare?.('internal');
      }
    } catch (error) {
      console.error('Failed to share internally:', error);
    } finally {
      setSending(false);
    }
  };

  const toggleTarget = (targetId: string) => {
    setSelectedTargets((prev) =>
      prev.includes(targetId) ? prev.filter((id) => id !== targetId) : [...prev, targetId],
    );
  };

  // Render inline variant
  if (variant === 'inline') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {shareOptions.map((option) => (
          <button
            key={option.name}
            onClick={option.action}
            className={`p-2 rounded-lg transition-colors bg-muted ${option.color}`}
            title={`Share on ${option.name}`}
          >
            {typeof option.icon === 'string' ? (
              <span className="font-bold text-lg">{option.icon}</span>
            ) : (
              option.icon
            )}
          </button>
        ))}
        <button
          onClick={copyToClipboard}
          className="p-2 rounded-lg transition-colors bg-muted hover:bg-hover"
          title="Copy link"
        >
          {copied ? (
            <CheckIcon className="w-5 h-5 text-success" />
          ) : (
            <LinkIcon className="w-5 h-5" />
          )}
        </button>
      </div>
    );
  }

  // Render button/menu variant
  return (
    <div ref={shareMenuRef} className={`relative ${className}`}>
      <button
        onClick={() => setShowShareMenu(!showShareMenu)}
        className="p-2 rounded-lg transition-colors text-tertiary hover:text-primary hover:bg-hover"
        title="Share"
      >
        <ShareIcon className="w-5 h-5" />
      </button>

      {/* Share menu */}
      {showShareMenu && (
        <div className="absolute z-50 mt-2 right-0 bg-surface border border-border rounded-lg shadow-lg w-64">
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-content">Share</h3>
              <button
                onClick={() => setShowShareMenu(false)}
                className="text-tertiary hover:text-content"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            {showStats && (
              <div className="mt-2 text-xs text-tertiary">
                {shareStats.total} shares ({shareStats.external} external, {shareStats.internal}{' '}
                internal)
              </div>
            )}
          </div>

          <div className="p-2">
            {/* Copy link button */}
            <button
              onClick={copyToClipboard}
              className="w-full px-3 py-2 text-left text-sm hover:bg-hover rounded transition-colors
                         flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3">
                <ClipboardDocumentIcon className="w-5 h-5 text-tertiary" />
                <span>{copied ? 'Copied!' : 'Copy link'}</span>
              </div>
              {copied && <CheckIcon className="w-4 h-4 text-success" />}
            </button>

            {/* Internal share button */}
            {user && (
              <button
                onClick={() => {
                  setShowShareMenu(false);
                  setShowInternalShare(true);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-hover rounded transition-colors
                           flex items-center space-x-3"
              >
                <UserGroupIcon className="w-5 h-5 text-tertiary" />
                <span>Share with users</span>
              </button>
            )}

            <div className="my-2 border-t border-border"></div>

            {/* External share options */}
            {shareOptions.map((option) => (
              <button
                key={option.name}
                onClick={option.action}
                className={`w-full px-3 py-2 text-left text-sm rounded transition-colors
                           flex items-center space-x-3 ${option.color}`}
              >
                <div className="w-5 h-5 flex items-center justify-center text-tertiary">
                  {typeof option.icon === 'string' ? (
                    <span className="font-bold">{option.icon}</span>
                  ) : (
                    option.icon
                  )}
                </div>
                <span>{option.name}</span>
                <ArrowTopRightOnSquareIcon className="w-3 h-3 ml-auto opacity-50" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Internal share modal */}
      {showInternalShare && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-content">Share with users</h3>
                <button
                  onClick={() => setShowInternalShare(false)}
                  className="text-tertiary hover:text-content"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4">
              {/* Content preview */}
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <p className="font-medium text-content text-sm">{content.title}</p>
                {content.description && (
                  <p className="text-xs text-tertiary mt-1">{content.description}</p>
                )}
              </div>

              {/* Target selection */}
              <div className="mb-4">
                <label className="text-sm font-medium text-content mb-2 block">Share with:</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {internalTargets.map((target) => (
                    <label
                      key={target.id}
                      className="flex items-center space-x-3 p-2 hover:bg-hover rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTargets.includes(target.id)}
                        onChange={() => toggleTarget(target.id)}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <div className="flex items-center space-x-2">
                        {target.type === 'group' && (
                          <UserGroupIcon className="w-4 h-4 text-tertiary" />
                        )}
                        {target.type === 'channel' && (
                          <ChatBubbleOvalLeftIcon className="w-4 h-4 text-tertiary" />
                        )}
                        <span className="text-sm">{target.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div className="mb-4">
                <label className="text-sm font-medium text-content mb-2 block">
                  Add a message (optional):
                </label>
                <textarea
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  placeholder="Hey, check this out..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg
                             text-sm focus:outline-none focus:border-primary resize-none"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={handleInternalShare}
                  disabled={selectedTargets.length === 0 || sending}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90
                             disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
                <button
                  onClick={() => setShowInternalShare(false)}
                  className="flex-1 px-4 py-2 bg-muted text-content rounded-lg hover:bg-hover
                             transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialSharing;
