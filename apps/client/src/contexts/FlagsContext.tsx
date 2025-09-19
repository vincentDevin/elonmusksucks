// apps/client/src/contexts/FlagsContext.tsx
// -----------------------------------------------------------------------------
// Feature Flag Context - Client-side Feature Control
// -----------------------------------------------------------------------------

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { FeatureFlagConfig } from '@ems/types';

interface FlagsContextType {
  flags: FeatureFlagConfig;
  isFeatureEnabled: (flag: string) => boolean;
  refreshFlags: () => Promise<void>;
}

const FlagsContext = createContext<FlagsContextType | undefined>(undefined);

interface FlagsProviderProps {
  children: ReactNode;
}

export function FlagsProvider({ children }: FlagsProviderProps) {
  const [flags, setFlags] = useState<FeatureFlagConfig>({});
  const [loading, setLoading] = useState(true);

  const refreshFlags = async () => {
    try {
      // Note: This endpoint would need to be implemented on the server
      // const response = await api.get('/api/feature-flags');
      // setFlags(response.data.flags);

      // For now, use environment-based flags
      const clientFlags: FeatureFlagConfig = {
        pong_beta: import.meta.env.VITE_FEATURE_PONG_BETA === 'true',
        enhanced_chat: import.meta.env.VITE_FEATURE_ENHANCED_CHAT === 'true',
        advanced_analytics: import.meta.env.VITE_FEATURE_ADVANCED_ANALYTICS === 'true',
        experimental_ui: import.meta.env.VITE_FEATURE_EXPERIMENTAL_UI === 'true',
      };
      setFlags(clientFlags);
    } catch (error) {
      console.error('[feature-flags] Failed to fetch feature flags:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshFlags();
  }, []);

  const isFeatureEnabled = (flag: string): boolean => {
    return flags[flag] || false;
  };

  const value: FlagsContextType = { flags, isFeatureEnabled, refreshFlags };

  if (loading) return <div>Loading features...</div>;
  return <FlagsContext.Provider value={value}>{children}</FlagsContext.Provider>;
}

export function useFeatureFlags(): FlagsContextType {
  const context = useContext(FlagsContext);
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FlagsProvider');
  }
  return context;
}
