// apps/client/src/components/prediction/ParlayBuilderWidget.tsx
import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { ArrowTrendingUpIcon as TrendingUp } from '@heroicons/react/24/outline';
import { useParlay } from '../../contexts/ParlayContext';
import ParlayPanel from './ParlayPanel';

interface ParlayBuilderWidgetProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left';
  hideOnMobile?: boolean;
}

/**
 * Floating Parlay Builder Widget following the QuickThemeSwitcher pattern
 * Collapsible circular button when minimized, expands to show full builder
 */
export const ParlayBuilderWidget: React.FC<ParlayBuilderWidgetProps> = ({
  className = '',
  position = 'bottom-right',
  hideOnMobile = false,
}) => {
  const { state: parlayState } = useParlay();
  const [isOpen, setIsOpen] = useState(false);

  // Position classes - stacked above FloatingCreatePredictionWidget (at 70px) and QuickThemeSwitcher
  const getPositionClasses = () => {
    return {
      'bottom-right': 'bottom-[132px] right-4', // 70px (Create) + 48px (widget) + 14px (gap)
      'bottom-left': 'bottom-[132px] left-4',
    }[position];
  };

  const getPanelPositionClasses = () => {
    return {
      'bottom-right': 'bottom-16 right-0',
      'bottom-left': 'bottom-16 left-0',
    }[position];
  };

  // Don't render if no legs
  if (parlayState.legs.length === 0) return null;

  return (
    <div
      className={`fixed z-50 ${getPositionClasses()} ${hideOnMobile ? 'hidden sm:block' : ''} ${className}`}
    >
      {/* Main Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-12 h-12 rounded-full transition-all duration-200
          flex items-center justify-center backdrop-blur-sm
          relative
          ${
            isOpen
              ? 'bg-secondary text-secondary-foreground rotate-0'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
          }
          border-2 ${isOpen ? 'border-secondary/60' : 'border-secondary/40'}
          hover:scale-110
        `}
        style={{
          boxShadow:
            '0 0 20px color-mix(in srgb, var(--color-secondary) 30%, transparent), 0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
        aria-label="Parlay builder"
        title={`Parlay Builder (${parlayState.legs.length} selections)`}
      >
        {isOpen ? (
          <FaTimes />
        ) : (
          <>
            <TrendingUp className="w-5 h-5" />
            {/* Badge showing number of selections */}
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-warning text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">
              {parlayState.legs.length}
            </div>
          </>
        )}
      </button>

      {/* Expanded Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div
            className={`
              absolute ${getPanelPositionClasses()}
              bg-surface border-2 border-secondary/40 rounded-xl backdrop-blur-sm
              w-[550px] lg:w-[600px] max-w-[calc(100vw-2rem)] max-h-[85vh] overflow-hidden
              transform transition-all duration-300
              ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}
              flex flex-col
            `}
            style={{
              boxShadow:
                '0 0 20px color-mix(in srgb, var(--color-secondary) 30%, transparent), 0 10px 25px rgba(0, 0, 0, 0.15)',
            }}
          >
            {/* Close button in top-right corner */}
            <div className="absolute top-3 right-3 z-10">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-tertiary hover:text-content"
                title="Close"
              >
                <FaTimes />
              </button>
            </div>

            {/* ParlayPanel content */}
            <div className="p-4 overflow-y-auto flex-1">
              <ParlayPanel />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ParlayBuilderWidget;
