import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatMuskBucks } from '../../utils/formatting';
import type { PredictionFull } from '@ems/types';
import { useParlay } from '../../contexts/ParlayContext';
import { getOptionClasses } from '../../utils/predictionColors';
import { useUnifiedTheme } from '../../theme/hooks/useUnifiedTheme';
import {
  ArrowLeftIcon as ArrowLeft,
  ShareIcon as Share2,
  BookmarkIcon as Bookmark,
  CheckIcon as BookmarkCheck,
  ClockIcon as Clock,
  ArrowTrendingUpIcon as TrendingUp,
  UsersIcon as Users,
  CurrencyDollarIcon as DollarSign,
  ArrowTopRightOnSquareIcon as ExternalLink,
  ChatBubbleOvalLeftIcon as MessageCircle,
  ChartBarIcon as BarChart3,
  CalendarIcon as Calendar,
  TrophyIcon as Trophy,
  ExclamationCircleIcon as AlertCircle,
  CheckCircleIcon as CheckCircle,
  EyeIcon as Target,
  BoltIcon as Zap,
} from '@heroicons/react/24/outline';
import OddsBar from './OddsBar';
import BetModal from './BetModal';
import { PredictionSourceList } from './PredictionSourceList';
import PredictionStats from './PredictionStats';
import PredictionBettingHistory from './PredictionBettingHistory';
import PredictionComments from './PredictionComments';
import PredictionReactions from './PredictionReactions';

interface PredictionDetailViewProps {
  prediction: PredictionFull;
  onBack?: () => void;
  className?: string;
}

const asNum = (v: string | number | bigint | undefined | null) => Number(v ?? 0);

export default function PredictionDetailView({
  prediction,
  onBack,
  className = '',
}: PredictionDetailViewProps) {
  const navigate = useNavigate();
  const { currentTheme } = useUnifiedTheme();
  const { state: parlayState, dispatch: parlayDispatch } = useParlay();
  const [showBetModal, setShowBetModal] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'history' | 'comments'>(
    'overview',
  );
  const [showShareModal, setShowShareModal] = useState(false);

  // Time calculations
  const now = Date.now();
  const expires = new Date(prediction.expiresAt).getTime();
  const createdAt = new Date(prediction.createdAt).getTime();
  const timeLeft = expires - now;
  const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));
  const daysLeft = Math.floor(hoursLeft / 24);
  const isExpired = now > expires;
  const isResolved = prediction.resolved;

  // Calculate progress
  const duration = expires - createdAt;
  const progress = ((now - createdAt) / duration) * 100;

  // Engagement metrics
  const totalBets = prediction.bets.length + (prediction.parlayLegs?.length || 0);
  const totalVolume =
    prediction.bets.reduce<number>((sum, bet) => sum + asNum(bet.amount), 0) +
    (prediction.parlayLegs?.reduce<number>((sum, leg) => sum + asNum(leg.stake), 0) || 0);

  // Check if in parlay
  const isInParlay = parlayState.legs.some((leg) => leg.predictionId === prediction.id);

  // Status badge
  const getStatusBadge = () => {
    if (isResolved)
      return {
        text: 'Resolved',
        color: 'bg-success text-surface',
        icon: <CheckCircle className="w-4 h-4" />,
      };
    if (isExpired)
      return {
        text: 'Expired',
        color: 'bg-error text-surface',
        icon: <AlertCircle className="w-4 h-4" />,
      };
    if (hoursLeft <= 24)
      return {
        text: 'Ending Soon',
        color: 'bg-warning text-surface',
        icon: <Clock className="w-4 h-4" />,
      };
    return {
      text: 'Active',
      color: 'bg-primary text-surface',
      icon: <Target className="w-4 h-4" />,
    };
  };

  const status = getStatusBadge();

  // Handle adding to parlay
  const handleAddToParlay = (optionId: number) => {
    const option = prediction.options.find((o) => o.id === optionId);
    if (!option) return;

    // Validate odds > 1.0 for parlays
    if (option.odds <= 1.0) {
      alert(
        `Cannot add to parlay: ${option.label} has odds of ${option.odds.toFixed(2)}×.\n\nParlay legs must have odds greater than 1.0× (break-even or better).`,
      );
      return;
    }

    parlayDispatch({
      type: 'ADD_LEG',
      leg: {
        predictionId: prediction.id,
        optionId,
        label: option.label,
        predictionTitle: prediction.title,
        odds: option.odds,
      },
    });
  };

  // Share functionality
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: prediction.title,
        text: prediction.description,
        url: window.location.href,
      });
    } else {
      setShowShareModal(true);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowShareModal(false);
  };

  return (
    <div className={`min-h-screen bg-background ${className}`}>
      {/* Header */}
      <div className="bg-surface border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack || (() => navigate(-1))}
                className="p-2 hover:bg-muted rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5 text-tertiary" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-content line-clamp-2">
                  {prediction.title}
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {prediction.category && (
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-sm inline-flex items-center gap-1">
                      {prediction.category.icon && <span>{prediction.category.icon}</span>}
                      <span>{prediction.category.name}</span>
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded text-sm flex items-center gap-1 ${status.color}`}
                  >
                    {status.icon}
                    {status.text}
                  </span>
                  {prediction.creator && (
                    <div className="flex items-center gap-2 px-2 py-0.5 bg-muted/30 rounded text-sm">
                      {prediction.creator.avatarUrl && (
                        <img
                          src={prediction.creator.avatarUrl}
                          alt={prediction.creator.name}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                      )}
                      <span className="text-tertiary">
                        by{' '}
                        <span className="text-content font-medium">{prediction.creator.name}</span>
                      </span>
                    </div>
                  )}
                  <PredictionReactions
                    predictionId={prediction.id}
                    initialReactionCounts={prediction.reactionCounts}
                    initialUserReaction={prediction.userReaction}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsBookmarked(!isBookmarked)}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  isBookmarked ? 'text-warning bg-warning/10' : 'text-tertiary hover:bg-muted'
                }`}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="w-5 h-5" />
                ) : (
                  <Bookmark className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={handleShare}
                className="p-2 text-tertiary hover:bg-muted rounded-lg transition-colors cursor-pointer"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {prediction.description && (
              <div className="bg-surface rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold text-content mb-3">Description</h2>
                <p className="text-content leading-relaxed whitespace-pre-wrap">
                  {prediction.description}
                </p>
              </div>
            )}

            {/* Source Links */}
            {prediction.sourceLinks && prediction.sourceLinks.length > 0 && (
              <div className="bg-surface rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold text-content mb-3 flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-primary" />
                  Sources & References
                </h2>
                <PredictionSourceList sources={prediction.sourceLinks} />
              </div>
            )}

            {/* Tabs */}
            <div className="bg-surface rounded-xl border border-border">
              <div className="border-b border-border">
                <div className="flex overflow-x-auto">
                  {[
                    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
                    { id: 'stats', label: 'Analytics', icon: <TrendingUp className="w-4 h-4" /> },
                    {
                      id: 'history',
                      label: 'Betting History',
                      icon: <Clock className="w-4 h-4" />,
                    },
                    {
                      id: 'comments',
                      label: 'Discussion',
                      icon: <MessageCircle className="w-4 h-4" />,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`
                        flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap
                        transition-colors cursor-pointer
                        ${
                          activeTab === tab.id
                            ? 'border-primary text-primary bg-primary/5'
                            : 'border-transparent text-tertiary hover:text-content hover:bg-muted/30'
                        }
                      `}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Odds Bar */}
                    <div>
                      <h3 className="text-lg font-semibold text-content mb-3">Current Odds</h3>
                      <OddsBar
                        variant="full"
                        type={prediction.type as any}
                        options={prediction.options as any}
                        bets={prediction.bets.map((bet) => ({
                          ...bet,
                          amount: bet.amount.toString(),
                          potentialPayout: bet.potentialPayout?.toString() ?? null,
                          payout: bet.payout?.toString() ?? null,
                        }))}
                        parlayLegs={
                          prediction.parlayLegs?.map((leg) => ({
                            ...leg,
                            stake: asNum(leg.stake),
                            createdAt:
                              typeof leg.createdAt === 'string'
                                ? leg.createdAt
                                : leg.createdAt.toISOString(),
                          })) || []
                        }
                        predictionId={prediction.id}
                        expiresAt={
                          typeof prediction.expiresAt === 'string'
                            ? prediction.expiresAt
                            : prediction.expiresAt.toISOString()
                        }
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'stats' && <PredictionStats prediction={prediction} />}

                {activeTab === 'history' && <PredictionBettingHistory prediction={prediction} />}

                {activeTab === 'comments' && <PredictionComments predictionId={prediction.id} />}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Time Progress */}
            {!isResolved && (
              <div className="bg-surface rounded-xl border border-border p-6">
                <h3 className="text-lg font-semibold text-content mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Time Remaining
                </h3>
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-content">
                      {isExpired
                        ? 'Expired'
                        : daysLeft > 0
                          ? `${daysLeft}d ${hoursLeft % 24}h`
                          : hoursLeft > 0
                            ? `${hoursLeft}h`
                            : 'Less than 1h'}
                    </div>
                    <p className="text-sm text-tertiary mt-1">
                      {isExpired ? 'Awaiting resolution' : 'Until expiration'}
                    </p>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isExpired ? 'bg-error' : hoursLeft <= 24 ? 'bg-warning' : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    />
                  </div>
                  <div className="text-xs text-tertiary text-center">
                    Created {new Date(prediction.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-surface rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-content mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Quick Stats
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-tertiary">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">Total Bets</span>
                  </div>
                  <span className="font-bold text-content">{totalBets}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-tertiary">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm">Total Volume</span>
                  </div>
                  <span className="font-bold text-content">{formatMuskBucks(totalVolume)} 🪙</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-tertiary">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm">Today's Activity</span>
                  </div>
                  <span className="font-bold text-content">
                    {
                      prediction.bets.filter(
                        (bet) => new Date(bet.createdAt).getTime() > now - 24 * 60 * 60 * 1000,
                      ).length
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-tertiary">
                    <Zap className="w-4 h-4" />
                    <span className="text-sm">Parlay Legs</span>
                  </div>
                  <span className="font-bold text-content">
                    {prediction.parlayLegs?.length || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {!isResolved && !isExpired && (
              <div className="bg-surface rounded-xl border border-border p-6">
                <h3 className="text-lg font-semibold text-content mb-4">Take Action</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setShowBetModal(true)}
                    className="w-full py-3 px-4 bg-primary hover:bg-primary-hover text-surface font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer hover:scale-105"
                  >
                    <Target className="w-4 h-4" />
                    Place Bet
                  </button>
                  {!isInParlay && (
                    <div className="space-y-2">
                      <p className="text-sm text-tertiary text-center">Add to parlay:</p>
                      {prediction.options.map((option, idx) => {
                        // Get theme-aware color classes
                        const colorClasses = getOptionClasses(currentTheme, prediction.type, idx);

                        return (
                          <button
                            key={option.id}
                            onClick={() => handleAddToParlay(option.id)}
                            className={`w-full py-3 px-4 ${colorClasses.bgTint} ${colorClasses.bgHover} border-2 font-semibold rounded-lg transition-all text-base md:text-lg hover:scale-[1.02] cursor-pointer text-content`}
                            style={{ borderColor: colorClasses.hex }}
                          >
                            {option.label} ({option.odds.toFixed(2)}x)
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {isInParlay && (
                    <div className="text-center py-2">
                      <span className="text-sm text-success">✓ Already in your parlay</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bet Modal */}
      <BetModal
        prediction={prediction}
        isOpen={showBetModal}
        onClose={() => setShowBetModal(false)}
        mode="modal"
      />

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-content mb-4">Share Prediction</h3>
            <div className="space-y-3">
              <button
                onClick={copyToClipboard}
                className="w-full py-2 px-4 bg-primary hover:bg-primary-hover text-surface rounded-lg transition-colors cursor-pointer"
              >
                Copy Link
              </button>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-full py-2 px-4 bg-muted hover:bg-muted/80 text-content rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
