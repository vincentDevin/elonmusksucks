/**
 * Socket.IO ACK (Acknowledgment) Types
 *
 * Types for socket acknowledgment callbacks
 */

// ============================================================================
// ACK Result Types
// ============================================================================

export interface AckOk {
  success: true;
  data?: unknown;
}

export interface AckErr {
  success: false;
  error: string;
  code?: string;
}

export type AckResult<T = unknown> = (AckOk & { data?: T }) | AckErr;

// ============================================================================
// ACK Callback Types
// ============================================================================

// Node-style ACK callback type (current pattern in betSocketHandlers.ts)
export type AckCallback = (err: string | null, data?: unknown) => void;

// Object-style ACK callback type (alternative pattern)
export type AckCallbackObj<T = unknown> = (result: AckResult<T>) => void;
