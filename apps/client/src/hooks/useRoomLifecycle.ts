// useRoomLifecycle.ts - Automatic room lifecycle management to prevent memory leaks
// CRITICAL SAFETY: Ensures rooms are left on unmount to prevent listener accumulation

import { useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';

/**
 * Automatically manages Socket.IO room membership with guaranteed cleanup
 *
 * PREVENTS: Memory leaks from accumulated listeners when navigating
 * ENSURES: Rooms are joined on mount, left on unmount
 *
 * @param rooms - Array of room names to join (e.g., ['user:123', 'leaderboard:daily'])
 *
 * @example
 * ```tsx
 * const Dashboard = () => {
 *   const { user } = useAuth();
 *   useRoomLifecycle([`user:${user.id}`, 'leaderboard:daily']);
 *   // Automatically joins rooms on mount, leaves on unmount
 * };
 * ```
 */
export const useRoomLifecycle = (rooms: string[]) => {
  const socket = useSocket();
  const previousRoomsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!socket.connected) {
      // Wait for socket connection before managing rooms
      return;
    }

    const currentRooms = rooms.filter((room) => room && room.trim()); // Filter out empty/invalid rooms
    const previousRooms = previousRoomsRef.current;

    // Find rooms to join (new rooms not in previous)
    const roomsToJoin = currentRooms.filter((room) => !previousRooms.includes(room));

    // Find rooms to leave (previous rooms not in current)
    const roomsToLeave = previousRooms.filter((room) => !currentRooms.includes(room));

    // Leave old rooms first
    roomsToLeave.forEach((room) => {
      socket.emit('leave', room);
      if (process.env.NODE_ENV === 'development') {
        console.log(`[useRoomLifecycle] Left room: ${room}`);
      }
    });

    // Join new rooms with server acknowledgment
    roomsToJoin.forEach((room) => {
      socket.emit('join', room, (response: any) => {
        if (process.env.NODE_ENV === 'development') {
          if (response?.success) {
            console.log(`[useRoomLifecycle] Successfully joined room: ${room}`);
          } else {
            console.warn(
              `[useRoomLifecycle] Failed to join room: ${room} - ${response?.error || 'Unknown error'}`,
            );
          }
        }
      });
    });

    // Update ref to track current rooms
    previousRoomsRef.current = currentRooms;

    // Cleanup function: Leave all current rooms on unmount
    return () => {
      currentRooms.forEach((room) => {
        socket.emit('leave', room);
        if (process.env.NODE_ENV === 'development') {
          console.log(`[useRoomLifecycle] Cleanup - Left room: ${room}`);
        }
      });
      previousRoomsRef.current = [];
    };
  }, [socket, ...rooms]); // Dependency on individual rooms to detect changes

  // Handle socket connection changes
  useEffect(() => {
    const handleConnect = () => {
      // Rejoin all rooms on reconnection with server acknowledgment
      const currentRooms = rooms.filter((room) => room && room.trim());
      currentRooms.forEach((room) => {
        socket.emit('join', room, (response: any) => {
          if (process.env.NODE_ENV === 'development') {
            if (response?.success) {
              console.log(`[useRoomLifecycle] Reconnected - Successfully joined room: ${room}`);
            } else {
              console.warn(
                `[useRoomLifecycle] Reconnected - Failed to join room: ${room} - ${response?.error || 'Unknown error'}`,
              );
            }
          }
        });
      });
    };

    const handleDisconnect = () => {
      // Clear room tracking on disconnect
      previousRoomsRef.current = [];
    };

    // Only handle programmatic reconnection, not initial connection
    // Initial room joins are handled by the main useEffect above

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket, rooms]);
};

/**
 * Development helper to monitor room membership
 * Only active in development mode
 */
export const useRoomDebugger = () => {
  const socket = useSocket();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const logRoomInfo = () => {
      socket.emit('rooms', (rooms: string[]) => {
        console.log('[Room Debugger] Current rooms:', rooms);
      });
    };

    // Log room info every 10 seconds in development
    const interval = setInterval(logRoomInfo, 10000);

    return () => clearInterval(interval);
  }, [socket]);
};

export default useRoomLifecycle;
