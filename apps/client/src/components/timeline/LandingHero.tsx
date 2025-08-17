// apps/client/src/components/timeline/LandingHero.tsx
import React from 'react';
import { Link } from 'react-router-dom';

interface LandingHeroProps {
  className?: string;
}

/**
 * Landing page hero section with satirical tone
 * Features:
 * - Dry, sardonic messaging about Elon/Tesla/SpaceX
 * - Call-to-action for registration
 * - Brief explanation of the platform
 * - Links to trending predictions
 */
export const LandingHero: React.FC<LandingHeroProps> = ({ className = '' }) => {
  return (
    <section
      className={`bg-gradient-to-b from-gray-900 to-gray-800 text-white py-16 px-4 ${className}`}
    >
      <div className="max-w-4xl mx-auto text-center">
        {/* Main Headline */}
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Predict the Unpredictable
          <br />
          <span className="text-blue-400">Musk Timeline</span>
        </h1>

        {/* Subheadline with dry humor */}
        <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed">
          Because someone has to keep track of the <em>visionary genius</em>
          who thinks tunnels will solve traffic and Mars needs a McDonald's.
        </p>

        {/* Value Proposition */}
        <div className="bg-gray-800/50 rounded-lg p-6 mb-8 backdrop-blur-sm">
          <p className="text-lg text-gray-200 mb-4">
            Track every Tesla "breakthrough," SpaceX "innovation," and X "improvement" in real-time.
            Place your bets with MuskBucks™ and watch the chaos unfold.
          </p>
          <p className="text-base text-gray-400">
            Featuring RSS feeds from tech journalism's finest and the occasional 3 AM Twitter
            meltdown. What could go wrong?
          </p>
        </div>

        {/* Call to Action */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Link
            to="/register"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors"
          >
            Start Predicting (It's Free)
          </Link>
          <Link
            to="/dashboard"
            className="bg-transparent border-2 border-gray-400 hover:border-white text-gray-300 hover:text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors"
          >
            Browse Timeline
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-gray-800/30 p-4 rounded-lg">
            <div className="text-2xl mb-2">📰</div>
            <h3 className="font-semibold mb-2">Curated News</h3>
            <p className="text-sm text-gray-300">
              Real articles from actual journalists who occasionally fact-check things.
            </p>
          </div>

          <div className="bg-gray-800/30 p-4 rounded-lg">
            <div className="text-2xl mb-2">🐦</div>
            <h3 className="font-semibold mb-2">Tweet Tracker</h3>
            <p className="text-sm text-gray-300">
              Every brilliant 280-character business strategy, archived for posterity.
            </p>
          </div>

          <div className="bg-gray-800/30 p-4 rounded-lg">
            <div className="text-2xl mb-2">📊</div>
            <h3 className="font-semibold mb-2">Prediction Market</h3>
            <p className="text-sm text-gray-300">
              Turn your cynicism into virtual currency. MuskBucks have no actual value.
            </p>
          </div>
        </div>

        {/* Disclaimer with humor */}
        <div className="mt-8 text-xs text-gray-500">
          <p>
            * elonmusksucks.net is a satirical platform for entertainment purposes. No actual
            rockets were harmed in the making of this website.
          </p>
          <p className="mt-1">
            ** MuskBucks are not legal tender and cannot be exchanged for Dogecoin, Tesla stock, or
            Mars real estate.
          </p>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
