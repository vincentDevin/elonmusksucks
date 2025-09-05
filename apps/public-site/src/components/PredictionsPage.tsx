import React from 'react';
import type { ServerData } from '../types';
import Layout from './Layout';

export default function PredictionsPage({
  predictionsData,
  clientAppUrl,
  currentPath,
}: ServerData) {
  const predictions = Array.isArray(predictionsData) ? predictionsData : [];

  const openPredictions = predictions.filter(
    (p) => p.status === 'APPROVED' && new Date(p.expiresAt) > new Date(),
  );
  const resolvedPredictions = predictions.filter((p) => p.status === 'RESOLVED');
  const expiredPredictions = predictions.filter(
    (p) => p.status === 'APPROVED' && new Date(p.expiresAt) <= new Date(),
  );

  const formatOdds = (odds: number) => {
    return `${odds.toFixed(1)}x`;
  };

  const getTotalVolume = (prediction: any) => {
    return prediction.bets.reduce((sum: number, bet: any) => sum + parseInt(bet.amount), 0);
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) return `${diffDays}d ${diffHours}h`;
    if (diffHours > 0) return `${diffHours} hours`;
    return 'Expires soon';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Tesla: 'bg-red-100 text-red-800',
      Twitter: 'bg-blue-100 text-blue-800',
      SpaceX: 'bg-purple-100 text-purple-800',
      Stocks: 'bg-green-100 text-green-800',
      Space: 'bg-indigo-100 text-indigo-800',
      TEST: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Layout currentPath={currentPath} clientAppUrl={clientAppUrl}>
      <div className="bg-background text-content min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="bg-surface rounded-lg p-8 mb-8 shadow">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-5xl font-bold mb-4">🎯 Predictions Market</h1>
              <p className="text-xl text-content/80 mb-2">
                Place your bets on what Elon will do next
              </p>
              <p className="text-lg text-content/70 mb-6">
                From stock prices to space launches, predict the chaos
              </p>

              <div className="flex justify-center space-x-4">
                <a
                  href={`${clientAppUrl}/login`}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover font-semibold transition-colors"
                >
                  Login to Place Bets
                </a>
                <a
                  href={`${clientAppUrl}/register`}
                  className="px-6 py-3 bg-surface border border-border text-content rounded-lg hover:bg-muted/20 font-semibold transition-colors"
                >
                  Create Account
                </a>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-surface rounded-lg p-4 shadow">
              <div className="text-3xl font-bold text-primary">{openPredictions.length}</div>
              <div className="text-sm text-tertiary">Open Predictions</div>
            </div>
            <div className="bg-surface rounded-lg p-4 shadow">
              <div className="text-3xl font-bold text-green-600">{resolvedPredictions.length}</div>
              <div className="text-sm text-tertiary">Resolved</div>
            </div>
            <div className="bg-surface rounded-lg p-4 shadow">
              <div className="text-3xl font-bold text-orange-600">
                {predictions.reduce((sum, p) => sum + p.bets.length, 0)}
              </div>
              <div className="text-sm text-tertiary">Total Bets</div>
            </div>
          </div>

          {/* Open Predictions */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <span className="text-green-500 mr-2">●</span> Open Predictions
            </h2>

            {openPredictions.length === 0 ? (
              <div className="bg-surface rounded-lg p-8 text-center">
                <p className="text-tertiary">No open predictions available right now</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {openPredictions.map((prediction) => (
                  <div
                    key={prediction.id}
                    className="bg-surface rounded-lg p-6 shadow hover:shadow-lg transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">{prediction.title}</h3>
                        {prediction.description && (
                          <p className="text-tertiary mb-2">{prediction.description}</p>
                        )}
                        <div className="flex items-center space-x-3">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(prediction.category)}`}
                          >
                            {prediction.category}
                          </span>
                          <span className="text-xs text-tertiary">
                            ⏰ {getTimeRemaining(prediction.expiresAt)}
                          </span>
                          <span className="text-xs text-tertiary">
                            💰 {getTotalVolume(prediction)} MB wagered
                          </span>
                          <span className="text-xs text-tertiary">
                            👥 {prediction.bets.length} bets
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-tertiary mb-1">Type</div>
                        <div className="font-medium">{prediction.type}</div>
                      </div>
                    </div>

                    {/* Options */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      {prediction.options.map((option) => (
                        <div key={option.id} className="bg-muted/20 rounded-lg p-3 text-center">
                          <div className="font-medium text-sm mb-1">{option.label}</div>
                          <div className="text-primary font-bold">{formatOdds(option.odds)}</div>
                        </div>
                      ))}
                    </div>

                    {/* Recent Bets */}
                    {prediction.bets.length > 0 && (
                      <div className="border-t border-border pt-4">
                        <div className="text-sm text-tertiary mb-2">Recent activity:</div>
                        <div className="flex flex-wrap gap-2">
                          {prediction.bets.slice(0, 3).map((bet) => (
                            <span key={bet.id} className="text-xs bg-muted/20 px-2 py-1 rounded">
                              {bet.userName} bet {bet.amount} MB
                            </span>
                          ))}
                          {prediction.bets.length > 3 && (
                            <span className="text-xs text-tertiary">
                              +{prediction.bets.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-4">
                      <a
                        href={`${clientAppUrl}/predictions`}
                        className="inline-block px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover transition-colors text-sm font-medium"
                      >
                        View Details & Place Bet →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resolved Predictions */}
          {resolvedPredictions.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <span className="text-gray-500 mr-2">✓</span> Recently Resolved
              </h2>

              <div className="grid gap-4">
                {resolvedPredictions.slice(0, 5).map((prediction) => {
                  const winningOption = prediction.options.find(
                    (o) => o.id === prediction.winningOptionId,
                  );
                  return (
                    <div
                      key={prediction.id}
                      className="bg-surface rounded-lg p-4 shadow opacity-75"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium mb-1">{prediction.title}</h3>
                          <div className="flex items-center space-x-3 text-sm">
                            <span className="text-tertiary">
                              Resolved: {new Date(prediction.resolvedAt!).toLocaleDateString()}
                            </span>
                            {winningOption && (
                              <span className="text-green-600 font-medium">
                                Winner: {winningOption.label}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-tertiary">Total Volume</div>
                          <div className="font-bold">{getTotalVolume(prediction)} MB</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="bg-surface rounded-lg p-8 text-center shadow">
            <h2 className="text-2xl font-bold mb-4">Ready to Make Your Predictions?</h2>
            <p className="text-tertiary mb-6">
              Join thousands of users predicting Elon's next move
            </p>
            <a
              href={`${clientAppUrl}/register`}
              className="inline-block px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover font-semibold text-lg transition-colors"
            >
              Start Predicting Now
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
