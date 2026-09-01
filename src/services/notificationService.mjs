import mongoose from 'mongoose';
import { Notification, NOTIFICATION_KINDS } from '../models/Notification.mjs';
import { User } from '../models/User.mjs';
import { UserRole } from '../models/enums/UserRole.mjs';
import { getIO } from '../sockets/socketHandler.mjs';

// Best-effort realtime emit. Fails silently so REST still works if the Socket.IO
// layer isn't up yet or a room has no online listener.
const emitRealtime = (room, payload) => {
  try {
    const io = getIO();
    if (!io) return;
    io.to(room).emit('notification', payload);
  } catch {
    // ignore; the notification is persisted regardless
  }
};

/**
 * Create a single notification for one user and (optionally) notify them in
 * realtime. `kind` is one of ADMIN | CLIENT | AGENT | SYSTEM; `recipientRole`
 * mirrors the target so the app can filter without extra fetches.
 */
export const createNotification = async ({
  recipientRole,
  recipientId,
  kind,
  title,
  message,
  senderId,
  announcement = false,
  bookingId,
}) => {
  const notification = await Notification.create({
    recipientId,
    recipientRole,
    kind,
    title,
    message,
    senderId,
    announcement,
    bookingId,
  });

  emitRealtime(`user:${recipientId}`, notification);
  emitRealtime(`role:${recipientRole}`, notification);

  return notification;
};

// Roles each announcement audience maps to.
const AUDIENCE_ROLES = {
  ALL: [UserRole.ADMIN, UserRole.AGENT, UserRole.CLIENT],
  ADMIN: [UserRole.ADMIN],
  CLIENT: [UserRole.CLIENT],
  AGENT: [UserRole.AGENT],
};

/**
 * Send an admin announcement to every user in the given audience
 * (ALL | ADMIN | CLIENT | AGENT). Creates one persisted Notification per
 * recipient and pushes it in realtime. Returns the created notifications.
 */
export const broadcastAnnouncement = async ({
  audience,
  title,
  message,
  senderId,
}) => {
  const roles = AUDIENCE_ROLES[audience] || AUDIENCE_ROLES.ALL;

  const recipients = await User.find(
    { role: { $in: roles }, isActive: true },
    { _id: 1, role: 1 },
  );

  const notifications = [];
  for (const user of recipients) {
    const notification = await Notification.create({
      recipientId: user._id,
      recipientRole: user.role,
      kind: NOTIFICATION_KINDS.SYSTEM,
      title: title || 'Announcement',
      message,
      senderId,
      announcement: true,
    });
    notifications.push(notification);

    emitRealtime(`user:${user._id}`, notification);
    emitRealtime(`role:${user.role}`, notification);
  }

  return notifications;
};