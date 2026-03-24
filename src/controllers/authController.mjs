import { asyncHandler, sendResponse } from '../utils/helpers.mjs';
import User from '../models/User.mjs';
import { generateAccessToken } from '../utils/jwt.mjs';

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    return sendResponse(res, 400, false, 'User already exists');
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role || 'client',
  });

  if (user) {
    const token = generateAccessToken(user);

    sendResponse(res, 201, true, 'User registered successfully', {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } else {
    sendResponse(res, 400, false, 'Invalid user data');
  }
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    const token = generateAccessToken(user);

    sendResponse(res, 200, true, 'Login successful', {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } else {
    sendResponse(res, 401, false, 'Invalid username or password');
  }
});
