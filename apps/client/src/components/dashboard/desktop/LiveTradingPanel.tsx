// apps/client/src/components/dashboard/desktop/LiveTradingPanel.tsx
import { useState, useEffect } from 'react';

interface LiveOrder {
  id: string;
  type: 'bet' | 'parlay';
  prediction: string;
  amount: number;
  odds: number;
  timestamp: string;
  status: 'pending' | 'confirmed' | 'rejected';
  user?: string;
}

interface MarketMovement {
  predictionId: string;
  title: string;
  oldOdds: number;
  newOdds: number;
  change: number;
  volume: number;
}

export default function LiveTradingPanel() {
  const [liveOrders, setLiveOrders] = useState<LiveOrder[]>([]);
  const [marketMovements, setMarketMovements] = useState<MarketMovement[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'movements'>('orders');

  useEffect(() => {
    // Simulate live data updates
    const interval = setInterval(() => {
      // Mock live orders
      if (Math.random() > 0.7) {
        const newOrder: LiveOrder = {
          id: Date.now().toString(),
          type: Math.random() > 0.7 ? 'parlay' : 'bet',
          prediction: `Prediction ${Math.floor(Math.random() * 100)}`,
          amount: Math.floor(Math.random() * 500) + 50,
          odds: Math.random() * 3 + 1.5,
          timestamp: new Date().toISOString(),
          status: 'pending',
          user: `User${Math.floor(Math.random() * 1000)}`,
        };

        setLiveOrders((prev) => [newOrder, ...prev.slice(0, 9)]);

        // Simulate status changes
        setTimeout(
          () => {
            setLiveOrders((prev) =>
              prev.map((order) =>
                order.id === newOrder.id
                  ? { ...order, status: Math.random() > 0.1 ? 'confirmed' : 'rejected' }
                  : order,
              ),
            );
          },
          Math.random() * 3000 + 1000,
        );
      }

      // Mock market movements
      if (Math.random() > 0.8) {
        const movement: MarketMovement = {
          predictionId: Date.now().toString(),
          title: `Market ${Math.floor(Math.random() * 50)}`,
          oldOdds: Math.random() * 3 + 1.5,
          newOdds: 0,
          change: 0,
          volume: Math.floor(Math.random() * 10000) + 1000,
        };
        movement.newOdds = movement.oldOdds * (1 + (Math.random() - 0.5) * 0.3);
        movement.change = ((movement.newOdds - movement.oldOdds) / movement.oldOdds) * 100;

        setMarketMovements((prev) => [movement, ...prev.slice(0, 9)]);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: LiveOrder['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-500';
      case 'confirmed':
        return 'text-green-500';
      case 'rejected':
        return 'text-red-500';
      default:
        return 'text-tertiary';
    }
  };

  const getStatusIcon = (status: LiveOrder['status']) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'confirmed':
        return '✅';
      case 'rejected':
        return '❌';
      default:
        return '⏳';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="bg-surface border border-muted rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-muted">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">⚡</span>
            <h3 className="font-semibold text-content">Live Trading</h3>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>

          <div className="flex bg-background rounded-lg p-1 border border-muted">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'orders'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-tertiary hover:text-content'
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'movements'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-tertiary hover:text-content'
              }`}
            >
              Markets
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="h-96 overflow-y-auto scrollbar-thin scrollbar-track-secondary/20 scrollbar-thumb-primary/40">
        {activeTab === 'orders' ? (
          /* Live Orders */
          <div className="p-4">
            {liveOrders.length === 0 ? (
              <div className="text-center py-8 text-tertiary">
                <div className="text-4xl mb-2">📊</div>
                <p>Waiting for live orders...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {liveOrders.map((order) => (
                  <div
                    key={order.id}
                    className={`p-3 rounded-lg border transition-all duration-300 ${
                      order.status === 'pending'
                        ? 'border-yellow-200 bg-yellow-50/10 animate-pulse'
                        : order.status === 'confirmed'
                          ? 'border-green-200 bg-green-50/10'
                          : 'border-red-200 bg-red-50/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`text-lg ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                        </div>
                        <div>
                          <div className="font-medium text-content text-sm">
                            {order.type === 'parlay' ? '🎰' : '🎯'} {order.prediction}
                          </div>
                          <div className="text-xs text-tertiary">
                            by {order.user} • {formatTime(order.timestamp)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-content">{order.amount}🪙</div>
                        <div className="text-xs text-tertiary">@ {order.odds.toFixed(2)}×</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Market Movements */
          <div className="p-4">
            {marketMovements.length === 0 ? (
              <div className="text-center py-8 text-tertiary">
                <div className="text-4xl mb-2">📈</div>
                <p>Waiting for market movements...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {marketMovements.map((movement) => (
                  <div
                    key={movement.predictionId}
                    className="p-3 rounded-lg border border-muted bg-background/30 hover:bg-background/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-content text-sm mb-1">
                          {movement.title}
                        </div>
                        <div className="text-xs text-tertiary">
                          Volume: {movement.volume.toLocaleString()}🪙
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`font-bold text-sm ${
                            movement.change >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}
                        >
                          {movement.change >= 0 ? '+' : ''}
                          {movement.change.toFixed(2)}%
                        </div>
                        <div className="text-xs text-tertiary">
                          {movement.oldOdds.toFixed(2)}× → {movement.newOdds.toFixed(2)}×
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-muted bg-background/30">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-content">{liveOrders.length}</div>
            <div className="text-xs text-tertiary">Live Orders</div>
          </div>
          <div>
            <div className="text-lg font-bold text-content">{marketMovements.length}</div>
            <div className="text-xs text-tertiary">Market Moves</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-500">
              {liveOrders.filter((o) => o.status === 'confirmed').length}
            </div>
            <div className="text-xs text-tertiary">Confirmed</div>
          </div>
        </div>
      </div>
    </div>
  );
}
