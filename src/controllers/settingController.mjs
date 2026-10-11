import { PlatformSetting } from '../models/PlatformSetting.mjs';
import { asyncHandler, sendResponse } from '../utils/helpers.mjs';

// GET /api/settings/platform
// Public: the booking fee and commission split are shown to every client on
// the booking screen, so the app can fetch them on startup before the user has
// authenticated.
export const getPlatformSettings = asyncHandler(async (req, res, next) => {
  try {
    const settings = await PlatformSetting.getPlatform();

    return sendResponse(res, 200, true, 'Platform settings fetched', {
      bookingFee: settings.bookingFee,
      commissionRate: settings.commissionRate,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings/platform  (ADMIN)
export const updatePlatformSettings = asyncHandler(async (req, res, next) => {
  try {
    const { bookingFee, commissionRate } = req.validatedData || req.body;

    const update = {};
    if (bookingFee !== undefined) update.bookingFee = bookingFee;
    if (commissionRate !== undefined) update.commissionRate = commissionRate;

    if (Object.keys(update).length === 0) {
      return sendResponse(res, 400, false, 'No settings provided to update');
    }

    const settings = await PlatformSetting.findOneAndUpdate(
      { key: 'platform' },
      { $set: update, $setOnInsert: { key: 'platform' } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return sendResponse(res, 200, true, 'Platform settings updated', {
      bookingFee: settings.bookingFee,
      commissionRate: settings.commissionRate,
    });
  } catch (error) {
    next(error);
  }
});