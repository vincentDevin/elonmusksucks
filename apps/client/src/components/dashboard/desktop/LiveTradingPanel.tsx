// apps/client/src/components/dashboard/desktop/LiveTradingPanel.tsx
import { useState, useEffect } from 'react';
import { useSocket } from '../../../contexts/SocketContext';

interface LiveOrder {
  id: string;
  type: 'bet' | 'parlay';
  prediction: string;
  amount: number;
  odds: number;
  timestamp: string;
  status: 'pending' | 'confirmed' | 'rejected';
  user?: string;
  userId?: number;
  predictionId?: number;
}

interface MarketMovement {
  predictionId: string;
  title: string;
  oldOdds: number;
  newOdds: number;
  change: number;
  volume: number;
  timestamp: string;
}

export default function LiveTradingPanel() {
  const socket = useSocket();
  const [liveOrders, setLiveOrders] = useState<LiveOrder[]>([]);
  const [marketMovements, setMarketMovements] = useState<MarketMovement[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'movements'>('orders');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // Listen for real bet placement events
    const handleBetPlaced = (data: any) => {
      const newOrder: LiveOrder = {
        id: `bet_${data.betId || data.id || Date.now()}`,
        type: 'bet',
        prediction: data.predictionTitle || data.prediction?.title || 'Unknown Prediction',
        amount: data.amount || 0,
        odds: data.odds || data.oddsAtPlacement || 1.0,
        timestamp: new Date().toISOString(),
        status: 'confirmed',
        user: data.userName || data.user?.name || 'Anonymous',
        userId: data.userId || data.user?.id,
        predictionId: data.predictionId,
      };

      setLiveOrders((prev) => [newOrder, ...prev.slice(0, 19)]);
    };

    // Listen for real parlay placement events
    const handleParlayPlaced = (data: any) => {
      const newOrder: LiveOrder = {
        id: `parlay_${data.parlayId || data.id || Date.now()}`,
        type: 'parlay',
        prediction: `${data.legCount || 0}-leg parlay`,
        amount: data.amount || 0,
        odds: data.combinedOdds || 1.0,
        timestamp: new Date().toISOString(),
        status: 'confirmed',
        user: data.userName || data.user?.name || 'Anonymous',
        userId: data.userId || data.user?.id,
      };

      setLiveOrders((prev) => [newOrder, ...prev.slice(0, 19)]);
    };

    // Listen for market movements (odds changes)
    const handleOddsChange = (data: any) => {
      const movement: MarketMovement = {
        predictionId: data.predictionId?.toString() || Date.now().toString(),
        title: data.predictionTitle || data.title || 'Market Update',
        oldOdds: data.oldOdds || 1.0,
        newOdds: data.newOdds || 1.0,
        change: data.change || 0,
        volume: data.volume || data.totalVolume || 0,
        timestamp: new Date().toISOString(),
      };

      setMarketMovements((prev) => [movement, ...prev.slice(0, 19)]);
    };

    // Listen for big bet alerts (whale activity)
    const handleBigBet = (data: any) => {
      if (data.amount >= 1000) {
        const newOrder: LiveOrder = {
          id: `whale_${data.betId || Date.now()}`,
          type: data.type === 'parlay' ? 'parlay' : 'bet',
          prediction: data.predictionTitle || 'High-Value Bet',
          amount: data.amount,
          odds: data.odds || 1.0,
          timestamp: new Date().toISOString(),
          status: 'confirmed',
          user: data.userName || '🐋 Whale',
          userId: data.userId,
          predictionId: data.predictionId,
        };

        setLiveOrders((prev) => [newOrder, ...prev.slice(0, 19)]);
      }
    };

    // Register Socket.IO event listeners
    socket.on('bet:placed', handleBetPlaced);
    socket.on('parlay:placed', handleParlayPlaced);
    socket.on('market:oddsChange', handleOddsChange);
    socket.on('bigBetAlert', handleBigBet);
    socket.on('prediction:trending', handleOddsChange); // Also show trending as market movement

    // Handle connection status
    const handleConnect = () => {
      setIsConnected(true);
      // No need to subscribe - events are automatically broadcast
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    // Set up connection listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Set initial connection state
    setIsConnected(socket.connected);

    // Events are automatically broadcast - no subscription needed

    return () => {
      socket.off('bet:placed', handleBetPlaced);
      socket.off('parlay:placed', handleParlayPlaced);
      socket.off('market:oddsChange', handleOddsChange);
      socket.off('bigBetAlert', handleBigBet);
      socket.off('prediction:trending', handleOddsChange);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

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
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}
            ></div>
            <span className="text-xs text-tertiary">{isConnected ? 'Live' : 'Disconnected'}</span>
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
                {isConnected ? (
                  <div>
                    <p>Waiting for live trading activity...</p>
                    <p className="text-xs mt-2">Orders will appear here when users place bets</p>
                  </div>
                ) : (
                  <div>
                    <p>Connecting to trading feed...</p>
                    <p className="text-xs mt-2">Real-time data will load once connected</p>
                  </div>
                )}
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
                {isConnected ? (
                  <div>
                    <p>Waiting for market movements...</p>
                    <p className="text-xs mt-2">Odds changes and volume spikes will appear here</p>
                  </div>
                ) : (
                  <div>
                    <p>Connecting to market data...</p>
                    <p className="text-xs mt-2">Live market updates will load once connected</p>
                  </div>
                )}
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
