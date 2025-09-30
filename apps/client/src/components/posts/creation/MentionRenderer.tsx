import React from 'react';
import { Link } from 'react-router-dom';

interface MentionRendererProps {
  content: string;
  className?: string;
}

interface ParsedContent {
  type: 'text' | 'mention' | 'hashtag' | 'link';
  content: string;
  username?: string;
  hashtag?: string;
  url?: string;
}

/**
 * Component that renders post content with clickable mentions, hashtags, and links
 */
export const MentionRenderer: React.FC<MentionRendererProps> = ({ content, className = '' }) => {
  const parseContent = (text: string): ParsedContent[] => {
    const parts: ParsedContent[] = [];

    // Combined regex for mentions, hashtags, and links
    const combinedRegex = /(@\w+)|(#\w+)|(https?:\/\/[^\s]+)/g;
    let lastIndex = 0;
    let match;

    while ((match = combinedRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        const textBefore = text.slice(lastIndex, match.index);
        if (textBefore) {
          parts.push({ type: 'text', content: textBefore });
        }
      }

      // Add the matched content
      const fullMatch = match[0];
      if (match[1]) {
        // Mention (@username)
        parts.push({
          type: 'mention',
          content: fullMatch,
          username: fullMatch.slice(1), // Remove @
        });
      } else if (match[2]) {
        // Hashtag (#tag)
        parts.push({
          type: 'hashtag',
          content: fullMatch,
          hashtag: fullMatch.slice(1), // Remove #
        });
      } else if (match[3]) {
        // Link (http/https)
        parts.push({
          type: 'link',
          content: fullMatch,
          url: fullMatch,
        });
      }

      lastIndex = match.index + fullMatch.length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(lastIndex) });
    }

    return parts;
  };

  const renderPart = (part: ParsedContent, index: number) => {
    switch (part.type) {
      case 'mention':
        return (
          <Link
            key={index}
            to={`/profile/${part.username}`}
            className="text-primary hover:text-primary/80 font-medium hover:underline transition-colors"
            title={`View @${part.username}'s profile`}
          >
            {part.content}
          </Link>
        );

      case 'hashtag':
        return (
          <Link
            key={index}
            to={`/hashtag/${part.hashtag}`}
            className="text-secondary hover:text-secondary/80 font-medium hover:underline transition-colors"
            title={`View posts with ${part.content}`}
          >
            {part.content}
          </Link>
        );

      case 'link':
        return (
          <a
            key={index}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 underline break-all"
            title="Open link in new tab"
          >
            {part.content}
          </a>
        );

      case 'text':
      default:
        return <span key={index}>{part.content}</span>;
    }
  };

  const parsedContent = parseContent(content);

  return (
    <div className={className}>{parsedContent.map((part, index) => renderPart(part, index))}</div>
  );
};

/**
 * Hook for extracting mentions from text content
 */
export const useMentionExtraction = () => {
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }

    return [...new Set(mentions)]; // Remove duplicates
  };

  const extractHashtags = (text: string): string[] => {
    const hashtagRegex = /#(\w+)/g;
    const hashtags: string[] = [];
    let match;

    while ((match = hashtagRegex.exec(text)) !== null) {
      hashtags.push(match[1].toLowerCase());
    }

    return [...new Set(hashtags)]; // Remove duplicates
  };

  return { extractMentions, extractHashtags };
};
