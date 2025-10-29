// apps/client/src/lib/safeStorage.ts
// ══════════════════════════════════════════════════════════════════════════════
// Safe Storage Wrapper with Security Documentation
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Safe localStorage wrapper with security considerations
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * SECURITY WARNING: localStorage Accessibility
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * localStorage is accessible to:
 * ✗ JavaScript code on the same origin (including XSS attacks)
 * ✗ Browser extensions with appropriate permissions
 * ✗ Users via DevTools (F12 → Application → Local Storage)
 * ✗ Malicious scripts injected via XSS vulnerabilities
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * DO NOT STORE IN localStorage:
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ✗ Passwords or password hashes
 * ✗ Access tokens (JWT or otherwise)
 * ✗ Refresh tokens
 * ✗ Session tokens
 * ✗ Personally identifiable information (PII)
 *   - Social Security Numbers
 *   - Credit card numbers
 *   - Bank account information
 *   - Driver's license numbers
 *   - Passport numbers
 * ✗ Payment information
 * ✗ Health records
 * ✗ API keys or secrets
 * ✗ Any sensitive user data
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * SAFE TO STORE IN localStorage:
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ✓ Theme preferences (dark/light mode)
 * ✓ Language preferences
 * ✓ UI state (sidebar collapsed, etc.)
 * ✓ Non-sensitive cached data (public content)
 * ✓ Feature flags (client-side)
 * ✓ Analytics preferences (opt-in/opt-out)
 * ✓ Draft content (posts, comments - with awareness it's not private)
 * ✓ Non-sensitive user preferences
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * CURRENT USAGE IN APPLICATION:
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ✓ Theme preference (apps/client/src/contexts/ThemeContext.tsx)
 *   - localStorage.getItem('theme')
 *   - Safe: Theme preference is not sensitive
 *
 * ✓ Parlay builder state (apps/client/src/contexts/ParlayContext.tsx)
 *   - localStorage.getItem('parlay-builder')
 *   - Semi-sensitive: Contains wager amounts (user's own data, not critical)
 *   - Recommendation: Consider encrypting or using sessionStorage
 *
 * ✓ Activity cache (apps/client/src/contexts/ActivityContext.tsx)
 *   - sessionStorage (even safer than localStorage - cleared on tab close)
 *   - Safe: Public activity data
 *
 * ✓ User data cache (apps/client/src/contexts/UserDataContext.tsx)
 *   - sessionStorage (cleared on tab close)
 *   - Safe: Cached public profile data
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * AUTHENTICATION TOKEN SECURITY:
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ✓ Access tokens: Stored in memory only (apps/client/src/api/axios.ts)
 *   - Never persisted to localStorage or sessionStorage
 *   - Lost on page refresh (must be refreshed from server)
 *
 * ✓ Refresh tokens: Stored in HTTP-only cookies by server
 *   - Cannot be accessed by JavaScript (XSS protection)
 *   - Automatically sent with requests to /api/auth/refresh
 *   - Server-side flags: httpOnly, secure, sameSite
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */

export const safeStorage = {
  /**
   * Get item from localStorage
   * Returns null if localStorage is not available or item doesn't exist
   */
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      // localStorage may be unavailable (private browsing, blocked by extension, etc.)
      if (import.meta.env.DEV) {
        console.warn('[safeStorage] localStorage.getItem failed:', error);
      }
      return null;
    }
  },

  /**
   * Set item in localStorage
   * Silently fails if localStorage is not available
   */
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // localStorage may be unavailable or full
      if (import.meta.env.DEV) {
        console.warn('[safeStorage] localStorage.setItem failed:', error);
      }
    }
  },

  /**
   * Remove item from localStorage
   * Silently fails if localStorage is not available
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[safeStorage] localStorage.removeItem failed:', error);
      }
    }
  },

  /**
   * Clear all items from localStorage
   * Silently fails if localStorage is not available
   */
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[safeStorage] localStorage.clear failed:', error);
      }
    }
  },

  /**
   * Get JSON object from localStorage
   * Returns null if item doesn't exist or is not valid JSON
   */
  getJSON<T = any>(key: string): T | null {
    const value = this.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[safeStorage] JSON.parse failed for key:', key, error);
      }
      return null;
    }
  },

  /**
   * Set JSON object in localStorage
   * Silently fails if localStorage is not available or JSON serialization fails
   */
  setJSON(key: string, value: any): void {
    try {
      const json = JSON.stringify(value);
      this.set(key, json);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[safeStorage] JSON.stringify failed for key:', key, error);
      }
    }
  },
};

/**
 * Session storage wrapper (same API as safeStorage)
 * sessionStorage is cleared when the browser tab is closed
 * Generally safer than localStorage for temporary data
 */
export const safeSessionStorage = {
  get(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[safeSessionStorage] sessionStorage.getItem failed:', error);
      }
      return null;
    }
  },

  set(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[safeSessionStorage] sessionStorage.setItem failed:', error);
      }
    }
  },

  remove(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[safeSessionStorage] sessionStorage.removeItem failed:', error);
      }
    }
  },

  clear(): void {
    try {
      sessionStorage.clear();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[safeSessionStorage] sessionStorage.clear failed:', error);
      }
    }
  },

  getJSON<T = any>(key: string): T | null {
    const value = this.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[safeSessionStorage] JSON.parse failed for key:', key, error);
      }
      return null;
    }
  },

  setJSON(key: string, value: any): void {
    try {
      const json = JSON.stringify(value);
      this.set(key, json);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[safeSessionStorage] JSON.stringify failed for key:', key, error);
      }
    }
  },
};
