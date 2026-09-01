import { Server } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.mjs';
import { User } from '../models/User.mjs';

let io;

// Authenticate each Socket.IO connection using the access token sent in the
// Socket.IO CONNECT handshake (`socket.handshake.auth.token`). On success we
// attach the verified user to the socket so room membership can be derived
// from identity rather than trusting client-supplied ids.
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Not authenticated'));
    }
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (!user || user.isActive === false) {
      return next(new Error('Not authenticated'));
    }
    socket.user = { _id: user._id.toString(), role: user.role };
    next();
  } catch (error) {
    return next(new Error('Not authenticated'));
  }
};

export const initSocket = (server) => {
  const allowedOrigins = [
    'https://accofinder.com',
    process.env.NODE_ENV === 'development' && 'http://localhost:5173',
  ].filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods:['GET','POST', 'PUT', 'PATCH', 'DELETE' ],
      // Credentials:
    },
    // The mobile Qt client connects via QWebSocket only (it has no engine.io
    // HTTP-polling transport), so restrict to the websocket transport.
    transports: ['websocket'],
  });

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Auto-join the authenticated user's own rooms so notifications are
    // delivered only to them. The client cannot choose arbitrary rooms.
    const { _id: userId, role } = socket.user || {};
    if (userId) {
      socket.join(`user:${userId}`);
      if (role) socket.join(`role:${role}`);
    }

    // Keep a join_room handler for compatibility, but refuse anything that is
    // not the authenticating user's own user/role room.
    socket.on('join_room', (data) => {
      const wanted = data?.room;
      const allowed = [
        userId && `user:${userId}`,
        userId && role && `role:${role}`,
      ].filter(Boolean);
      if (allowed.includes(wanted)) {
        socket.join(wanted);
      }
      console.log(`User with ID: ${socket.id} joined room: ${wanted}`);
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
