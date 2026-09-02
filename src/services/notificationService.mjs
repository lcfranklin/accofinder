import mongoose from 'mongoose';
import { Notification, NOTIFICATION_KINDS } from '../models/Notification.mjs';
import { User } from '../models/User.mjs';
import { UserRole } from '../models/enums/UserRole.mjs';
import { getIO } from '../sockets/socketHandler.mjs';
import { sendPushNotification } from '../config/firebase.mjs';

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
 * Send a push notification to a single user via FCM.
 * Looks up the user's stored fcmToken and sends a push if available.
 */
const sendPushToUser = async (userId, title, body, data = {}) => {
  try {
    const user = await User.findById(userId).select('fcmToken');
    if (!user || !user.fcmToken) return;

    await sendPushNotification({
      tokens: [user.fcmToken],
      title,
      body,
      data,
    });
  } catch {
    // best-effort — don't break the notification flow
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

  // Send FCM push notification in the background (best-effort)
  sendPushToUser(recipientId, title, message, {
    notificationId: String(notification._id),
    kind,
  });

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
    { _id: 1, role: 1, fcmToken: 1 },
  );

  const notifications = [];
  const fcmTokens = [];

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

    // Collect FCM tokens for batch push
    if (user.fcmToken) {
      fcmTokens.push(user.fcmToken);
    }
  }

  // Send a single multicast push to all recipients with FCM tokens
  if (fcmTokens.length > 0) {
    sendPushNotification({
      tokens: fcmTokens,
      title: title || 'Announcement',
      body: message,
      data: { kind: 'SYSTEM' },
    }).catch(() => {});
  }

  return notifications;
};