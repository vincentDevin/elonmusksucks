import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL ?? window.location.origin;

export const socket: Socket = io(SOCKET_URL, {
  withCredentials: true,
});
