import { Review } from '../models/Review.mjs';
import { Booking } from '../models/Booking.mjs';
import { Property } from '../models/Property.mjs';
import { User } from '../models/User.mjs';
import { BookingStatus } from '../models/enums/BookingStatus.mjs';
import { asyncHandler, sendResponse, withId, withIdList } from '../utils/helpers.mjs';
import mongoose from 'mongoose';

const CONFIRMED_STATUSES = [BookingStatus.CONFIRMED, BookingStatus.PAID];

const populateReview = (q) =>
  q.populate('clientId', 'firstName surname').populate('propertyId', 'title');

// GET /reviews/property/:propertyId
export const getReviewsByProperty = asyncHandler(async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return sendResponse(res, 400, false, 'Invalid property ID');
    }
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 10)));
    const filter = { propertyId: new mongoose.Types.ObjectId(propertyId) };
    const total = await Review.countDocuments(filter);
    const reviews = await populateReview(
      Review.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    );
    return sendResponse(res, 200, true, 'Reviews retrieved', withIdList(reviews), { page, limit, total });
  } catch (error) {
    next(error);
  }
});

// GET /reviews/agent/:agentId
export const getReviewsByAgent = asyncHandler(async (req, res, next) => {
  try {
    const { agentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return sendResponse(res, 400, false, 'Invalid agent ID');
    }
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 10)));
    const filter = { agentId: new mongoose.Types.ObjectId(agentId) };
    const total = await Review.countDocuments(filter);
    const reviews = await populateReview(
      Review.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    );
    return sendResponse(res, 200, true, 'Reviews retrieved', withIdList(reviews), { page, limit, total });
  } catch (error) {
    next(error);
  }
});

// GET /reviews/property/:propertyId/summary
export const getReviewSummary = asyncHandler(async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return sendResponse(res, 400, false, 'Invalid property ID');
    }
    const agg = await Review.aggregate([
      { $match: { propertyId: new mongoose.Types.ObjectId(propertyId) } },
      { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const summary = agg.length ? { average: agg[0].average, count: agg[0].count } : { average: 0, count: 0 };
    return sendResponse(res, 200, true, 'Summary retrieved', summary);
  } catch (error) {
    next(error);
  }
});

// GET /reviews/can-review/:propertyId
export const canReview = asyncHandler(async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return sendResponse(res, 400, false, 'Invalid property ID');
    }
    const userId = req.user._id || req.user.id || req.user.sub;

    // Existing review?
    const existing = await Review.findOne({ clientId: userId, propertyId });
    if (existing) {
      return sendResponse(res, 200, true, 'Already reviewed', { canReview: false, reason: 'already_reviewed', reviewId: String(existing._id) });
    }

    // Eligibility: a confirmed booking for this property (or a room in it)
    const property = await Property.findById(propertyId);
    if (!property) {
      return sendResponse(res, 404, false, 'Property not found');
    }

    // Find rooms of this property
    const { Room } = await import('../models/Room.mjs');
    const rooms = await Room.find({ propertyId }).select('_id');
    const roomIds = rooms.map((r) => r._id);

    const booking = await Booking.findOne({
      clientId: userId,
      status: { $in: CONFIRMED_STATUSES },
      $or: [
        { bookableItemType: 'Property', bookableItemId: new mongoose.Types.ObjectId(propertyId) },
        { bookableItemType: 'Room', bookableItemId: { $in: roomIds } },
      ],
    });

    if (!booking) {
      return sendResponse(res, 200, true, 'Not eligible', { canReview: false, reason: 'no_completed_booking', reviewId: null });
    }

    return sendResponse(res, 200, true, 'Eligible', { canReview: true, reason: '', reviewId: null });
  } catch (error) {
    next(error);
  }
});

// POST /reviews
export const createReview = asyncHandler(async (req, res, next) => {
  try {
    const { propertyId, agentId, bookingId, rating, comment } = req.validatedData;
    const clientId = req.user._id || req.user.id || req.user.sub;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return sendResponse(res, 400, false, 'Invalid property ID');
    }

    // Duplicate check
    const existing = await Review.findOne({ clientId, propertyId });
    if (existing) {
      return sendResponse(res, 409, false, 'You have already reviewed this property');
    }

    // Eligibility
    const property = await Property.findById(propertyId);
    if (!property) return sendResponse(res, 404, false, 'Property not found');

    const { Room } = await import('../models/Room.mjs');
    const rooms = await Room.find({ propertyId }).select('_id');
    const roomIds = rooms.map((r) => r._id);
    const booking = await Booking.findOne({
      clientId,
      status: { $in: CONFIRMED_STATUSES },
      $or: [
        { bookableItemType: 'Property', bookableItemId: new mongoose.Types.ObjectId(propertyId) },
        { bookableItemType: 'Room', bookableItemId: { $in: roomIds } },
      ],
    });
    if (!booking) {
      return sendResponse(res, 403, false, 'You can only review properties you have stayed at');
    }

    const review = await Review.create({
      clientId,
      propertyId: new mongoose.Types.ObjectId(propertyId),
      agentId: agentId && mongoose.Types.ObjectId.isValid(agentId) ? new mongoose.Types.ObjectId(agentId) : (property.owner || null),
      bookingId: bookingId && mongoose.Types.ObjectId.isValid(bookingId) ? new mongoose.Types.ObjectId(bookingId) : booking._id,
      rating,
      comment,
    });

    const populated = await populateReview(Review.findById(review._id));
    return sendResponse(res, 201, true, 'Review created', withId(populated));
  } catch (error) {
    if (error && error.code === 11000) {
      return sendResponse(res, 409, false, 'You have already reviewed this property');
    }
    next(error);
  }
});

// PATCH /reviews/:id
export const updateReview = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, 'Invalid review ID');
    }
    const review = await Review.findById(id);
    if (!review) return sendResponse(res, 404, false, 'Review not found');

    const userId = String(req.user._id || req.user.id || req.user.sub);
    if (String(review.clientId) !== userId && String(req.user.role || '').toUpperCase() !== 'ADMIN') {
      return sendResponse(res, 403, false, 'You can only edit your own reviews');
    }

    const { rating, comment } = req.validatedData || req.body;
    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;
    await review.save();

    const populated = await populateReview(Review.findById(review._id));
    return sendResponse(res, 200, true, 'Review updated', withId(populated));
  } catch (error) {
    next(error);
  }
});

// DELETE /reviews/:id
export const deleteReview = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, 'Invalid review ID');
    }
    const review = await Review.findById(id);
    if (!review) return sendResponse(res, 404, false, 'Review not found');

    const userId = String(req.user._id || req.user.id || req.user.sub);
    const isAdmin = String(req.user.role || '').toUpperCase() === 'ADMIN';
    if (String(review.clientId) !== userId && !isAdmin) {
      return sendResponse(res, 403, false, 'You can only delete your own reviews');
    }

    await Review.findByIdAndDelete(id);
    return sendResponse(res, 200, true, 'Review deleted');
  } catch (error) {
    next(error);
  }
});