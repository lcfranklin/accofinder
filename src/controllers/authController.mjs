import { asyncHandler, sendResponse } from '../utils/helpers.mjs';
import User from '../models/User.mjs';
import passport from 'passport';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.mjs';
import crypto from 'crypto';
import Otp from '../models/Otp.mjs';
import sendEmail from '../utils/sendEmail.mjs';
/**
 * Register a new user
 */
export const registerUser = asyncHandler(async (req, res, next) => {
  const { name, email, password, confirmPassword, residentialAddress } =
    req.validatedData;

  if (password !== confirmPassword) {
    return sendResponse(res, 400, false, 'Passwords do not match');
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
    role: 'CLIENT',
  });

  if (user) {
    // Automatically log in the user after registration
    req.login(user, (err) => {
      if (err) return next(err);
      console.log('--- Login Successful: through registration ---');
      console.log('User ID:', user._id);
      console.log('Session ID:', req.sessionID);
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      sendResponse(
        res,
        201,
        true,
        'User registered and logged in successfully',
        {
          _id: user._id,
          name: user.name,
          email: user.email,
          residentialAddress: user.residentialAddress,
          role: user.role,
          accessToken,
          refreshToken,
        },
      );
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
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      return sendResponse(res, 200, true, 'Login successful', {
        _id: user._id,
        name: user.name,
        email: user.email,
        residentialAddress: user.residentialAddress,
        role: user.role,
        accessToken,
        refreshToken,
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

/**
 * Get a new access token using a refresh token
 */
import { verifyRefreshToken } from '../utils/jwt.mjs';

export const refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return sendResponse(res, 400, false, 'Refresh token is required');
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.sub);

    if (!user) {
      return sendResponse(
        res,
        401,
        false,
        'Invalid refresh token: User not found',
      );
    }

    const newAccessToken = generateAccessToken(user);

    sendResponse(res, 200, true, 'Access token refreshed successfully', {
      accessToken: newAccessToken,
    });
  } catch (error) {
    return sendResponse(res, 401, false, 'Invalid or expired refresh token');
  }
};
//verify-email

export const checkEmail = async (req, res, next) => {
  try {
    const { email } = req.query;

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.exists({ email: normalizedEmail });

    return res.status(200).json({
      success: true,
      exists: Boolean(existingUser),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request an OTP
 */
export const requestOtp = asyncHandler(async (req, res) => {
  const { email, purpose } = req.body;
  
  const EMAIL_REGEX = /^(?=[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,})[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const isValidEmail = EMAIL_REGEX.test(email);

  if (!email || !purpose) {
    return sendResponse(res, 400, false, "Email and purpose are required");
  }

  if (!isValidEmail) {
    return sendResponse(res, 400, false, "Invalid email format");
  }

  if (!["registration", "login", "password_reset"].includes(purpose)) {
    return sendResponse(res, 400, false, "Invalid purpose");
  }

  const user = await User.findOne({ email });
  if (!user) {
    return sendResponse(res, 404, false, "User not found");
  }

  // Invalidate any existing PENDING OTPs for this user and purpose
  await Otp.updateMany(
    { user: user._id, purpose: purpose, status: "PENDING" },
    { $set: { status: "EXPIRED" } }
  );

  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

  const otp = new Otp({
    user: user._id,
    code,
    purpose,
    status: "PENDING",
    expiresAt,
  });

  await otp.save();

  // Send OTP via email
  const emailRes = await sendEmail(
    user.email,
    code,
    purpose
  );

  if (!emailRes) {
    console.log("Failed to send OTP email with status: " + emailRes);
    return sendResponse(res, 500, false, "Failed to send OTP email");
  }

  sendResponse(res, 200, true, "OTP sent successfully",otp.code);
});

/**
 * Verify an OTP
 */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, code, purpose } = req.body;
  if (!email || !code || !purpose) {
    return sendResponse(res, 400, false, "Email, code, and purpose are required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    return sendResponse(res, 404, false, "User not found");
  }

  const otp = await Otp.findOne({
    user: user._id,
    code,
    purpose,
    status: "PENDING",
  });

  if (!otp) {
    return sendResponse(res, 400, false, "Invalid OTP");
  }

  if (otp.expiresAt < new Date()) {
    otp.status = "EXPIRED";
    await otp.save();
    return sendResponse(res, 400, false, "OTP has expired");
  }

  otp.status = "USED";
  await otp.save();

  sendResponse(res, 200, true, "OTP verified successfully");
});