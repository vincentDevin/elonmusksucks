import { Server, Socket } from 'socket.io';

export function registerRoomHandlers(io: Server, socket: Socket) {
  socket.on('joinRoom', (room: string) => {
    socket.join(room);
    // Use 'io' so TypeScript doesn't complain:
    console.log(
      `[socket] ${socket.id} joined ${room}. Total rooms:`,
      io.sockets.adapter.rooms.size,
    );
  });

  socket.on('leaveRoom', (room: string) => {
    socket.leave(room);
    console.log(`[socket] ${socket.id} left ${room}`);
  });
}
