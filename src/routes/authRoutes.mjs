import express from 'express';
import passport from 'passport';
import { registerUser, loginUser, logoutUser, getMe, googleCallback, refreshAccessToken } from '../controllers/authController.mjs';
import { validateRequest } from '../middleware/requestValidationMiddleware.mjs';
import { registerUserSchema } from '../validators/registerUserSchema.mjs';
import { loginUserSchema } from '../validators/loginUserSchema.mjs';
import { isAuthenticated } from '../middleware/authMiddleware.mjs';

const authRoutes = express.Router();

// Local Auth
authRoutes.post('/register', validateRequest(registerUserSchema), registerUser);
authRoutes.post('/login', validateRequest(loginUserSchema), loginUser);
authRoutes.post('/logout', logoutUser);
authRoutes.post('/refresh', refreshAccessToken);
authRoutes.get('/me', isAuthenticated, getMe);

// Google Auth
authRoutes.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
authRoutes.get('/callback/google', 
  passport.authenticate('google', { failureRedirect: '/login' }), 
  googleCallback
);

export default authRoutes;
