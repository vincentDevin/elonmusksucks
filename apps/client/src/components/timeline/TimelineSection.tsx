// apps/client/src/components/timeline/TimelineSection.tsx
import React from 'react';
import Timeline from './Timeline';
import LandingHero from './LandingHero';

interface TimelineSectionProps {
  className?: string;
  showHero?: boolean;
  defaultTab?: 'articles' | 'tweets';
}

/**
 * Complete Timeline section for homepage integration
 * Features:
 * - Optional landing hero section
 * - Full timeline with articles and tweets
 * - Responsive design
 * - SEO-friendly structure
 */
export const TimelineSection: React.FC<TimelineSectionProps> = ({
  className = '',
  showHero = true,
  defaultTab = 'articles',
}) => {
  return (
    <section className={`${className}`}>
      {showHero && (
        <div className="mb-12">
          <LandingHero />
        </div>
      )}

      {/* Timeline Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Latest Musk-Related News</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Real-time feed of articles and tweets about Elon Musk's ventures, controversies, and
          market-moving statements. Use any item as a source for your predictions.
        </p>
      </div>

      {/* Main Timeline */}
      <div className="max-w-4xl mx-auto">
        <Timeline initialTab={defaultTab} className="bg-gray-50 rounded-xl p-6" />
      </div>

      {/* Call to Action */}
      <div className="text-center mt-12 p-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Found an interesting story?</h3>
        <p className="text-gray-600 mb-4">
          Use any article or tweet as evidence for your predictions
        </p>
        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
          Create Prediction
        </button>
      </div>
    </section>
  );
};

export default TimelineSection;
