import jwt from 'jsonwebtoken';

/**
 * Generate a JSON Web Token
 * @param {string} id - The user ID to encode
 * @param {string} expiresIn - Expiration time (default '30d')
 * @returns {string} The signed JWT
 */
export const generateToken = (id, expiresIn = '30d') => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn,
  });
};

/**
 * Verify and decode a JSON Web Token
 * @param {string} token - The token to verify
 * @returns {Object} decoded payload or throws an error
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
  } catch (error) {
    throw new Error('Not authorized, token failed');
  }
};
