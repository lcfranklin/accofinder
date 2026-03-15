import { Server } from 'socket.io';

let io;



export const initSocket = (server) => {
  const allowedOrigins = [
    'https://accofinder.com',
    process.env.NODE_ENV === 'development' && 'http://localhost:5173', 
  ].filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: allowedOrigins, 
      // methods:['GET','POST', 'PUT', 'PATCH', 'DELETE' ]
      // Credentials:
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join_room', (data) => {
      socket.join(data.room);
      console.log(`User with ID: ${socket.id} joined room: ${data.room}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
