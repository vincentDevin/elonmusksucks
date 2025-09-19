# Feature Flag Documentation

## Overview

Feature flags provide runtime control over application features, enabling safe rollouts, A/B testing, and emergency kill switches.

## Available Feature Flags

| Flag | Environment Variable | Purpose | Default |
|------|---------------------|---------|---------|
| `pong_beta` | `FEATURE_PONG_BETA` | Pong game beta features | `false` |
| `enhanced_chat` | `FEATURE_ENHANCED_CHAT` | Advanced chat features | `false` |
| `advanced_analytics` | `FEATURE_ADVANCED_ANALYTICS` | Enhanced analytics dashboard | `false` |
| `experimental_ui` | `FEATURE_EXPERIMENTAL_UI` | Experimental UI components | `false` |

## Server-side Usage

```typescript
import { isFeatureEnabled, FeatureFlags } from '../lib/flags';

// Check feature in controller/service
if (isFeatureEnabled(FeatureFlags.PONG_BETA)) {
  // Enable beta Pong features
}

// Emergency kill switch
import { disableFeature } from '../lib/flags';
disableFeature(FeatureFlags.PONG_BETA);
```

## Client-side Usage

```typescript
import { useFeatureFlags } from '../contexts/FlagsContext';

function MyComponent() {
  const { isFeatureEnabled } = useFeatureFlags();
  
  return (
    <div>
      {isFeatureEnabled('pong_beta') && <PongBetaFeatures />}
    </div>
  );
}
```

## Configuration

### Environment Variables (Server)
```bash
# Enable Pong beta features
FEATURE_PONG_BETA=true
FEATURE_ENHANCED_CHAT=false
```

### Environment Variables (Client)
```bash
# Vite environment variables
VITE_FEATURE_PONG_BETA=true
VITE_FEATURE_ENHANCED_CHAT=false
```

## Emergency Procedures

### Kill Switch Activation
```typescript
// Server-side emergency disable
import { disableFeature, FeatureFlags } from './lib/flags';
disableFeature(FeatureFlags.PONG_BETA);
```

### Monitoring & Alerts
- Monitor feature flag usage via application logs
- Alert on emergency kill switch activations
- Track feature adoption metrics

## Best Practices

1. **Default to disabled**: New features should be disabled by default
2. **Gradual rollout**: Enable for small user percentages first  
3. **Monitor closely**: Watch metrics during feature rollouts
4. **Clean up**: Remove flags after full rollout or permanent disabling
5. **Document changes**: Update this documentation when adding/removing flags

**Last Updated**: Feature flag infrastructure documented with kill switch procedures