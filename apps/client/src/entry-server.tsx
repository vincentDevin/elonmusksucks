// apps/client/src/entry-server.tsx
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import App from './App';
import type { TimelineItem } from '@ems/types';

/**
 * Server-side rendering entry point for Homepage Timeline SEO
 * 
 * This file is used by the Express server to render the homepage (`/` route)
 * with initial timeline data for better SEO and social media previews.
 */

interface SSRRenderOptions {
  url: string;
  initialData?: {
    articles: TimelineItem[];
    meta?: {
      title?: string;
      description?: string;
      ogImage?: string;
    };
  };
}

export function render({ url, initialData }: SSRRenderOptions) {
  try {
    // Render the app with StaticRouter for SSR
    const html = renderToString(
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    );

    // Generate meta tags based on content
    const meta = generateMetaTags(initialData?.meta);

    // Serialize initial data for client hydration
    const serializedData = initialData ? JSON.stringify(initialData) : 'null';

    return {
      html,
      meta,
      initialData: serializedData
    };

  } catch (error) {
    console.error('[SSR] Error rendering app:', error);
    
    // Return minimal fallback for graceful degradation
    return {
      html: '<div id="root"></div>',
      meta: generateMetaTags(),
      initialData: 'null'
    };
  }
}

/**
 * Generate SEO meta tags for the homepage
 */
function generateMetaTags(meta?: {
  title?: string;
  description?: string;
  ogImage?: string;
}) {
  const title = meta?.title || 'elonmusksucks.net - The Musk Timeline & Prediction Market';
  const description = meta?.description || 
    'Track every Tesla breakthrough, SpaceX innovation, and X improvement in real-time. ' +
    'Place your bets with MuskBucks™ and watch the chaos unfold.';
  const ogImage = meta?.ogImage || '/og-image.jpg';
  const siteUrl = process.env.SITE_URL || 'https://elonmusksucks.net';

  return {
    title,
    description,
    tags: [
      // Basic meta tags
      `<meta name="description" content="${description}" />`,
      `<meta name="keywords" content="Elon Musk, Tesla, SpaceX, X, Twitter, prediction market, betting, news timeline" />`,
      `<meta name="author" content="elonmusksucks.net" />`,
      
      // Open Graph tags for social media
      `<meta property="og:title" content="${title}" />`,
      `<meta property="og:description" content="${description}" />`,
      `<meta property="og:image" content="${siteUrl}${ogImage}" />`,
      `<meta property="og:url" content="${siteUrl}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="elonmusksucks.net" />`,
      
      // Twitter Card tags
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${title}" />`,
      `<meta name="twitter:description" content="${description}" />`,
      `<meta name="twitter:image" content="${siteUrl}${ogImage}" />`,
      
      // Additional SEO tags
      `<meta name="robots" content="index, follow" />`,
      `<meta name="googlebot" content="index, follow" />`,
      `<link rel="canonical" href="${siteUrl}" />`,
      
      // Schema.org structured data for search engines
      `<script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "elonmusksucks.net",
          "url": "${siteUrl}",
          "description": "${description}",
          "author": {
            "@type": "Organization",
            "name": "elonmusksucks.net"
          },
          "sameAs": []
        }
      </script>`
    ].join('\n      ')
  };
}

export default render;