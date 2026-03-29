import Recommendation from '../models/Recommendation.mjs';
import { asyncHandler, sendResponse } from '../utils/helpers.mjs';

/**
 * Get personalized house recommendations for the authenticated user.
 * (Skeleton: Logic to be implemented)
 */
export const getMyRecommendations = asyncHandler(async (req, res) => {
  const recommendations = await Recommendation.find({ user: req.user._id })
    .populate('house')
    .sort({ score: -1 })
    .limit(10);

  sendResponse(res, 200, true, 'Recommendations fetched successfully', recommendations);
});

/**
 * Manually trigger recommendation generation (example).
 */
export const generateRecommendations = asyncHandler(async (req, res) => {
  // TODO: Implement recommender engine logic here
  sendResponse(res, 200, true, 'Recommendation generation started');
});
