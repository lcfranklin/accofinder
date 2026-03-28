import { asyncHandler, sendResponse } from '../utils/helpers.mjs';
import User from '../models/User.mjs';
import passport from 'passport';

/**
 * Register a new user
 */
export const registerUser = asyncHandler(async (req, res, next) => {
  const { name, email, password, confirmPassword, residentialAddress } = req.validatedData;

  if (password !== confirmPassword) {
    return sendResponse(res, 400, false, "Passwords do not match");
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    return sendResponse(res, 400, false, 'User already exists');
  }

  const user = await User.create({
    name,
    email,
    password,
    residentialAddress,
    role: 'client',
  });

  if (user) {
    // Automatically log in the user after registration
    req.login(user, (err) => {
      if (err) return next(err);
      console.log('--- Login Successful: through registration ---');
      console.log('User ID:', user._id);
      console.log('Session ID:', req.sessionID);
      sendResponse(res, 201, true, 'User registered and logged in successfully', {
        _id: user._id,
        name: user.name,
        email: user.email,
        residentialAddress: user.residentialAddress,
        role: user.role,
      });
    });
  } else {
    sendResponse(400, false, 'Invalid user data');
  }
});

/**
 * Login user using Passport local strategy
 */
export const loginUser = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return sendResponse(res, 401, false, info.message || 'Login failed');
    }

    req.login(user, (err) => {
      if (err) return next(err);
      console.log('--- Login Successful ---');
      console.log('User ID:', user._id);
      console.log('Session ID:', req.sessionID);
      return sendResponse(res, 200, true, 'Login successful', {
        _id: user._id,
        name: user.name,
        email: user.email,
        residentialAddress: user.residentialAddress,
        role: user.role,
      });
    });
  })(req, res, next);
};

/**
 * Handle Google OAuth callback
 */
export const googleCallback = (req, res) => {
  // Successful authentication, redirect or send response
  sendResponse(res, 200, true, 'Google login successful', {
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    residentialAddress: req.user.residentialAddress,
    role: req.user.role,
  });
};

/**
 * Logout user
 */
export const logoutUser = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy();
    res.clearCookie('connect.sid'); 
    sendResponse(res, 200, true, 'Logged out successfully');
  });
};

/**
 * Get current user profile
 */
export const getMe = (req, res) => {
  if (req.user) {
    sendResponse(res, 200, true, 'User profile fetched', {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      residentialAddress: req.user.residentialAddress,
      role: req.user.role,
    });
  } else {
    sendResponse(res, 401, false, 'Not authenticated');
  }
};
