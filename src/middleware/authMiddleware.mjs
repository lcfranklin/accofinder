import { sendResponse } from '../utils/helpers.mjs';
import passport from 'passport';

/**
 * Intelligent Middleware to check if the user is authenticated.
 * It first checks for a valid session (Web).
 * If no session is found, it falls back to checking for a Bearer JWT (Mobile/API).
 */
export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    console.log('--- Auth Check: Session Authenticated ---');
    console.log('User ID:', req.user._id);
    return next();
  }

  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      console.error('JWT Auth Error:', err);
      return next(err);
    }
    
    if (user) {
      console.log('--- Auth Check: JWT Authenticated ---');
      console.log('User ID:', user._id);
      req.user = user; 
      return next();
    }

    console.log('--- Auth Check: Not Authenticated ---');
    return sendResponse(res, 400, false, 'Not authenticated. Please provide a valid session cookie or JWT.');
  })(req, res, next);
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
