import { sendResponse } from '../utils/helpers.mjs';

/**
 * Middleware to check if the user is authenticated via session.
 */
export const isAuthenticated = (req, res, next) => {
  console.log('--- Auth Check ---');
  console.log('Session ID:', req.sessionID);
  console.log('Authenticated:', req.isAuthenticated());
  console.log('User:', req.user ? req.user._id : 'None');

  if (req.isAuthenticated()) {
    return next();
  }
  return sendResponse(res, 401, false, 'Not authenticated, please log in');
};

/**
 * Middleware to check if the user has the required roles.
 */
export const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendResponse(res, 403, false, 'Access denied: insufficient permissions');
    }
    next();
  };
};
