import { sendResponse } from '../utils/helpers.mjs';
import passport from 'passport';

/**
 * Intelligent Middleware to check if the user is authenticated.
 * It first checks for a valid session (Web).
 * If no session is found, it falls back to checking for a Bearer JWT (Mobile/API).
 */
export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (user) {
      req.user = user;
      return next();
    }

    return sendResponse(res, 401, false, 'Not authenticated, please log in');
  })(req, res, next);
};

/**
 * Middleware to check if the user has the required roles.
 */
export const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendResponse(
        res,
        403,
        false,
        'Access denied: insufficient permissions',
      );
    }
    next();
  };
};
