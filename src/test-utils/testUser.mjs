import { User } from '../models/User.mjs';
import { generateAccessToken } from '../utils/jwt.mjs';

export const createTestUser = async ({
  email,
  firstName = 'Test',
  surname = 'User',
  role = 'CLIENT',
}) => {
  const suffix = Math.floor(100000000 + Math.random() * 900000000);
  const user = await User.create({
    firstName,
    surname,
    email,
    phone: `+265${suffix}`,
    password: 'Test123!',
    residentialAddress: 'Test address',
    role,
    isEmailVerified: true,
  });

  return { user, accessToken: generateAccessToken(user) };
};
