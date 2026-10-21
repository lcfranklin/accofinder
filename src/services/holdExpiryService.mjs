import { Booking } from '../models/Booking.mjs';
import { Room } from '../models/Room.mjs';
import { Property } from '../models/Property.mjs';
import { BookingStatus } from '../models/enums/BookingStatus.mjs';
import { createNotification } from './notificationService.mjs';
import { releaseHold } from './holdService.mjs';
import {
  HOLD_SUBJECT_STATUSES,
  HOLD_SWEEP_INTERVAL_MS,
} from '../config/holdConfig.mjs';

// Automatic release of lapsed provisional holds.
//
// This is the component that closes the inventory leak. Without it a hold is
// only ever cleared by the user acting (cancelling, paying, or the app
// verifying a payment), and "user never came back" leaves the room stuck.
//
// Why a sweeper rather than a Mongo TTL index: a TTL index would *delete*
// documents, and we need a controlled transition to EXPIRED, cleared hold
// fields on the room, and a notification. It also cannot touch fields on
// another collection at all.
//
// Correctness does not depend on the sweeper running: isRoomBookable() treats a
// lapsed hold as free, so a room is bookable again the moment its window
// passes. The sweeper exists to keep stored state honest (so listings and
// reports agree) and to notify the user. That means a crash or a paused
// process degrades to "room becomes bookable late-cleanup" rather than
// "room stays locked".

// A hold is expired when its window has passed, or when it has blown through
// the absolute ceiling regardless of any in-flight extension.
const expiredHoldFilter = (now) => ({
  status: { $in: HOLD_SUBJECT_STATUSES },
  $or: [{ expiresAt: { $lte: now } }, { hardExpiresAt: { $lte: now } }],
});

/**
 * Expire every hold whose window has closed.
 *
 * Safe to call concurrently from multiple processes: each booking is claimed by
 * an atomic findOneAndUpdate that only matches a still-live hold status, so two
 * sweeps racing over the same rows will each win a disjoint set.
 *
 * @param {object} [options]
 * @param {boolean} [options.notify=true] send client/owner notifications
 * @param {number}  [options.limit=200]  max bookings processed per sweep
 * @returns {Promise<{expired: number, roomsReleased: number, errors: number}>}
 */
export const releaseExpiredHolds = async ({
  notify = true,
  limit = 200,
} = {}) => {
  const now = new Date();
  const stats = { expired: 0, roomsReleased: 0, errors: 0 };

  const candidates = await Booking.find(expiredHoldFilter(now))
    .sort({ expiresAt: 1 })
    .limit(limit)
    .select('_id roomId clientId status amount');

  for (const candidate of candidates) {
    try {
      // Re-check atomically so we never expire a booking that was confirmed or
      // cancelled between the find above and now.
      const claimed = await Booking.findOneAndUpdate(
        {
          _id: candidate._id,
          status: candidate.status,
          $or: [{ expiresAt: { $lte: now } }, { hardExpiresAt: { $lte: now } }],
        },
        {
          $set: {
            status: BookingStatus.EXPIRED,
            expiredAt: now,
            expiresAt: null,
          },
        },
        { returnDocument: 'after' },
      );

      // Lost a race with a payment confirmation or a cancel.
      if (!claimed) continue;

      stats.expired += 1;

      // releaseHold only clears the room if this booking still holds it, so a
      // late payment that confirmed the booking just before we got here cannot
      // be undone by the sweeper.
      const released = await releaseHold({
        roomId: claimed.roomId,
        bookingId: claimed._id,
      });
      if (released) stats.roomsReleased += 1;

      if (notify) {
        const ownerMessage =
          'A hold on your property expired without payment. The room is bookable again.';
        const clientMessage =
          'Your hold on this room expired before payment was completed, so the room is available to others.';

        if (claimed.clientId) {
          await createNotification({
            recipientRole: 'CLIENT',
            recipientId: claimed.clientId,
            kind: 'SYSTEM',
            title: 'Booking hold expired',
            message: clientMessage,
            senderId: claimed.clientId,
            bookingId: claimed._id,
          });
        }

        // Best-effort owner lookup; a notification failure must not abort the
        // sweep, so this is wrapped separately.
        try {
          const room = await Room.findById(claimed.roomId).select('propertyId');
          const owner = room?.propertyId
            ? (await Property.findById(room.propertyId))?.owner
            : null;
          if (owner) {
            await createNotification({
              recipientRole: 'AGENT',
              recipientId: owner,
              kind: 'SYSTEM',
              title: 'Booking hold expired',
              message: ownerMessage,
              senderId: claimed.clientId,
              bookingId: claimed._id,
            });
          }
        } catch {
          // Ignore: the hold is already released, which is what matters.
        }
      }
    } catch (error) {
      // One bad booking must not stop the sweep for every other hold.
      stats.errors += 1;
      console.error(
        `[holdExpiry] failed to expire booking ${candidate._id}:`,
        error.message,
      );
    }
  }

  if (stats.expired > 0 || stats.errors > 0) {
    console.log(
      `[holdExpiry] expired=${stats.expired} roomsReleased=${stats.roomsReleased} errors=${stats.errors}`,
    );
  }

  return stats;
};

/**
 * Clear hold fields from rooms whose hold has lapsed but whose booking was
 * removed (or crashed) before the sweeper could clean it up.
 *
 * Purely cosmetic — isRoomBookable() already treats these rooms as free — but
 * it keeps the collection tidy and stops the hold fields from confusing
 * admins and support.
 */
export const pruneStaleRoomHolds = async () => {
  const now = new Date();

  const result = await Room.updateMany(
    {
      holdRef: { $ne: null },
      holdExpiresAt: { $ne: null, $lte: now },
    },
    { $set: { holdRef: null, holdExpiresAt: null } },
  );

  return result.modifiedCount || 0;
};

let intervalHandle = null;

/**
 * Start the periodic sweep. Runs once immediately so a restart cleans up
 * anything that lapsed while the process was down.
 */
export const startHoldExpiryJob = () => {
  const run = async () => {
    try {
      await releaseExpiredHolds();
      await pruneStaleRoomHolds();
    } catch (error) {
      console.error('[holdExpiry] sweep failed:', error.message);
    }
  };

  if (intervalHandle) return intervalHandle;

  run();
  intervalHandle = setInterval(run, HOLD_SWEEP_INTERVAL_MS);
  // Do not keep the event loop alive purely for the sweeper.
  intervalHandle.unref?.();

  console.log(
    `[holdExpiry] sweeper started (interval=${HOLD_SWEEP_INTERVAL_MS}ms)`,
  );

  return intervalHandle;
};

export const stopHoldExpiryJob = () => {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
};