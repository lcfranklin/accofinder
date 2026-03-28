import User from '../models/User.mjs';
import dotenv from "dotenv"
import { verifyAccessToken } from '../utils/jwt.mjs';

dotenv.config();

export const authenticateJWT = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = verifyAccessToken(token);

      const userId = decoded.sub || decoded.id;   

      if (!userId) {
        return res.status(401).json({ message: 'Not authorized, invalid token payload' });
      }

      const user = await User.findById(userId).select('-password');

      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      req.user = user;
      console.log("User attached to request:", req.user);   

      next();
    } catch (error) {
      console.error("JWT Error:", error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};
