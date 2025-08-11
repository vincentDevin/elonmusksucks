// apps/client/src/components/dashboard/analytics/SmartInsights.tsx
import { useState, useEffect, memo } from 'react';

interface SmartInsightsProps {
  insights: string[];
  className?: string;
}

const SmartInsights = memo(function SmartInsights({
  insights,
  className = '',
}: SmartInsightsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Rotate through insights every 5 seconds
  useEffect(() => {
    if (insights.length <= 1) return;

    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % insights.length);
        setIsAnimating(false);
      }, 150);
    }, 5000);

    return () => clearInterval(interval);
  }, [insights.length]);

  if (insights.length === 0) {
    return (
      <div className={`bg-background/50 rounded-xl p-4 border border-muted ${className}`}>
        <h3 className="font-semibold text-content mb-3 flex items-center">💡 Smart Insights</h3>
        <div className="text-center py-4 text-tertiary">
          <div className="text-2xl mb-2">🔍</div>
          <p className="text-sm">Start betting to see personalized insights!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-background/50 rounded-xl p-4 border border-muted ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-content flex items-center">💡 Smart Insights</h3>
        {insights.length > 1 && (
          <div className="flex space-x-1">
            {insights.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="relative min-h-[3rem] flex items-center">
        <div
          className={`transition-all duration-150 ${
            isAnimating
              ? 'opacity-0 transform translate-y-2'
              : 'opacity-100 transform translate-y-0'
          }`}
        >
          <div className="flex items-start space-x-3">
            <div className="text-2xl">
              {currentIndex === 0 ? '🔥' : currentIndex === 1 % insights.length ? '🎯' : '📈'}
            </div>
            <div className="flex-1">
              <p className="text-sm text-content font-medium leading-relaxed">
                {insights[currentIndex]}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar for rotation */}
      {insights.length > 1 && (
        <div className="mt-3 w-full bg-muted rounded-full h-1">
          <div
            className="bg-primary rounded-full h-1 transition-all duration-[5000ms] ease-linear"
            style={{
              width: '100%',
              animation: 'progress 5s linear infinite',
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
});

export default SmartInsights;
