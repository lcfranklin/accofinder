import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property ID is required'],
    },
    type: {
      type: String,
      required: [true, 'Room type is required'],
      trim: true,
    },
    price: {
      type: Number,
      default: 0,
    },
    available: {
      type: Boolean,
      default: true,
    },

    // --- Provisional hold (see src/config/holdConfig.mjs) ---
    //
    // `available` is no longer flipped to false the moment a booking is
    // created; it stays true and the room is taken off the market by the hold
    // instead. This is what stops an abandoned checkout from leaking
    // inventory.
    //
    // holdRef      - the booking that currently holds this room, or null.
    // holdExpiresAt- when that hold lapses. After this instant the room is
    //               bookable again even though these fields have not been
    //               cleared yet, so bookable queries must not rely on the
    //               field alone.
    holdRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    holdExpiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// The release sweeper scans for lapsed holds, and "is this room bookable?"
// checks whether a hold is still live. Both are range scans on holdExpiresAt.
roomSchema.index({ holdExpiresAt: 1 });
roomSchema.index({ available: 1, holdExpiresAt: 1 });

export const Room = mongoose.model('Room', roomSchema);
