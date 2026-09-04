import express from 'express';
import passport from 'passport';
import {
  registerUser,
  loginUser,
  getMe,
  googleCallback,
  refreshAccessToken,
  checkEmail,
  logoutUser,
  requestOtp, 
  verifyOtp,
  resetPassword
} from '../controllers/authController.mjs';
import { validateRequest } from '../middleware/requestValidationMiddleware.mjs';
import { registerUserSchema } from '../validators/registerUserSchema.mjs';
import { loginUserSchema } from '../validators/loginUserSchema.mjs';
import { isAuthenticated } from '../middleware/authMiddleware.mjs';
import { checkEmailSchema } from '../validators/checkEmailSchema.mjs';

const authRoutes = express.Router();

// Local Auth
authRoutes.post('/register', validateRequest(registerUserSchema), registerUser);
authRoutes.post('/login', validateRequest(loginUserSchema), loginUser);
authRoutes.post('/logout', logoutUser);
authRoutes.get(
  '/check-email',
  validateRequest(checkEmailSchema, 'query'),
  checkEmail,
);
authRoutes.post('/refresh', refreshAccessToken);
authRoutes.get('/me', isAuthenticated, getMe);
authRoutes.post('/otp/request', requestOtp);
authRoutes.post('/otp/verify', verifyOtp);
authRoutes.post('/password/reset', resetPassword);

// Google Auth
authRoutes.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }),
);
authRoutes.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  googleCallback,
);

export default authRoutes;
