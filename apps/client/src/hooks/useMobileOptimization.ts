// apps/client/src/hooks/useMobileOptimization.ts
import { useState, useEffect, useCallback } from 'react';

export interface MobileState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
  screenWidth: number;
  screenHeight: number;
  touchDevice: boolean;
  connectionType: 'slow' | 'fast' | 'unknown';
}

export function useMobileOptimization() {
  const [mobileState, setMobileState] = useState<MobileState>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    orientation: 'landscape',
    screenWidth: 1920,
    screenHeight: 1080,
    touchDevice: false,
    connectionType: 'unknown',
  });

  const [reducedMotion, setReducedMotion] = useState(false);
  const [prefersDarkMode, setPrefersDarkMode] = useState(false);

  // Update mobile state based on screen dimensions and device capabilities
  const updateMobileState = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;
    const touchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Detect connection speed (if available)
    let connectionType: 'slow' | 'fast' | 'unknown' = 'unknown';
    if ('connection' in navigator) {
      const connection = (navigator as unknown as { connection?: { effectiveType?: string } })
        .connection;
      if (connection?.effectiveType) {
        // Consider 2G and slow-2g as slow, 3G and above as fast
        connectionType = ['2g', 'slow-2g'].includes(connection.effectiveType) ? 'slow' : 'fast';
      }
    }

    setMobileState({
      isMobile,
      isTablet,
      isDesktop,
      orientation: width > height ? 'landscape' : 'portrait',
      screenWidth: width,
      screenHeight: height,
      touchDevice,
      connectionType,
    });
  }, []);

  // Check for reduced motion preference
  const checkReducedMotion = useCallback(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
  }, []);

  // Check for dark mode preference
  const checkDarkModePreference = useCallback(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setPrefersDarkMode(mediaQuery.matches);
  }, []);

  // Initialize and listen for changes
  useEffect(() => {
    updateMobileState();
    checkReducedMotion();
    checkDarkModePreference();

    const handleResize = () => updateMobileState();
    const handleOrientationChange = () => {
      // Small delay to ensure dimensions are updated after orientation change
      setTimeout(updateMobileState, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Listen for reduced motion changes
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleReducedMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);

    // Listen for dark mode changes
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleDarkModeChange = (e: MediaQueryListEvent) => setPrefersDarkMode(e.matches);
    darkModeQuery.addEventListener('change', handleDarkModeChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      darkModeQuery.removeEventListener('change', handleDarkModeChange);
    };
  }, [updateMobileState, checkReducedMotion, checkDarkModePreference]);

  // Performance optimization functions
  const shouldUseReducedData = useCallback(() => {
    return mobileState.connectionType === 'slow' || mobileState.isMobile;
  }, [mobileState.connectionType, mobileState.isMobile]);

  const shouldReduceAnimations = useCallback(() => {
    return reducedMotion || mobileState.isMobile || mobileState.connectionType === 'slow';
  }, [reducedMotion, mobileState.isMobile, mobileState.connectionType]);

  const getOptimalImageSize = useCallback(() => {
    if (mobileState.isMobile) return 'small';
    if (mobileState.isTablet) return 'medium';
    return 'large';
  }, [mobileState.isMobile, mobileState.isTablet]);

  const getOptimalRefreshRate = useCallback(() => {
    if (mobileState.connectionType === 'slow') return 60000; // 1 minute
    if (mobileState.isMobile) return 30000; // 30 seconds
    return 15000; // 15 seconds
  }, [mobileState.connectionType, mobileState.isMobile]);

  // Layout helpers
  const shouldUseCompactLayout = useCallback(() => {
    return mobileState.isMobile || (mobileState.isTablet && mobileState.orientation === 'portrait');
  }, [mobileState.isMobile, mobileState.isTablet, mobileState.orientation]);

  const getColumnCount = useCallback(() => {
    if (mobileState.isMobile) return 1;
    if (mobileState.isTablet) return mobileState.orientation === 'landscape' ? 2 : 1;
    return 2; // Desktop
  }, [mobileState.isMobile, mobileState.isTablet, mobileState.orientation]);

  const shouldShowSidebar = useCallback(() => {
    return (
      mobileState.isDesktop || (mobileState.isTablet && mobileState.orientation === 'landscape')
    );
  }, [mobileState.isDesktop, mobileState.isTablet, mobileState.orientation]);

  // Touch gesture helpers
  const isTouchDevice = mobileState.touchDevice;

  const getTouchGestureConfig = useCallback(() => {
    if (!isTouchDevice) return null;

    return {
      swipeThreshold: 50,
      longPressDelay: 500,
      doubleTapDelay: 300,
      pinchThreshold: 0.1,
    };
  }, [isTouchDevice]);

  // Adaptive UI helpers
  const getFontSizeMultiplier = useCallback(() => {
    if (mobileState.isMobile) return 0.9;
    if (mobileState.isTablet) return 0.95;
    return 1.0;
  }, [mobileState.isMobile, mobileState.isTablet]);

  const getSpacingMultiplier = useCallback(() => {
    if (mobileState.isMobile) return 0.8;
    if (mobileState.isTablet) return 0.9;
    return 1.0;
  }, [mobileState.isMobile, mobileState.isTablet]);

  return {
    // State
    ...mobileState,
    reducedMotion,
    prefersDarkMode,

    // Performance optimization
    shouldUseReducedData,
    shouldReduceAnimations,
    getOptimalImageSize,
    getOptimalRefreshRate,

    // Layout helpers
    shouldUseCompactLayout,
    getColumnCount,
    shouldShowSidebar,

    // Touch helpers
    isTouchDevice,
    getTouchGestureConfig,

    // UI helpers
    getFontSizeMultiplier,
    getSpacingMultiplier,

    // Utility
    updateMobileState,
  };
}
