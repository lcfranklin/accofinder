import mongoose from 'mongoose';

// Platform-wide, admin-controlled settings. There is exactly one document
// (keyed `platform`) so callers never have to search for "the" settings row.
const platformSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'platform',
    },
    // Flat fee (in MK) a client pays to book any listing. This is what the
    // mobile app caches locally and uses at checkout, so it must be readable
    // before the user has signed in.
    bookingFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    // Agent commission on a booking, as a percentage of the booking fee
    // (e.g. 10 = 10% of the fee). Persisted here so every device earns the
    // same split at checkout.
    commissionRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 10,
    },
  },
  { timestamps: true },
);

// Returns the singleton settings document, creating it with defaults on first
// access. `setDefaultsOnInsert` + `$setOnInsert` keeps the upsert from
// clobbering a fee an admin has already saved.
platformSettingSchema.statics.getPlatform = function getPlatform() {
  return this.findOneAndUpdate(
    { key: 'platform' },
    { $setOnInsert: { key: 'platform' } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
};

export const PlatformSetting = mongoose.model('PlatformSetting', platformSettingSchema);
