import Interaction from '../models/Interaction.mjs';

/**
 * Middleware to track user interactions with houses for the recommender system.
 * This logs "view" events when a user visits a house listing.
 */
export const trackHouseInteraction = async (req, res, next) => {
  try {
    if (req.user && req.params.id) {
      Interaction.create({
        user: req.user._id,
        house: req.params.id,
        type: 'view',
        metadata: {
          source: req.query.source || 'direct',
        }
      }).catch(err => console.error('Error tracking interaction:', err));
    }
  } catch (error) {
    console.error('Tracking middleware error:', error.message);
    sendResponse(res, 500, false, 'Error tracking interaction');
  } finally {
    next();
  }
};
