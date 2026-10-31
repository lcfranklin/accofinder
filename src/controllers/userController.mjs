import { User } from '../models/User.mjs';
import { UserRole } from '../models/enums/UserRole.mjs';
import mongoose from 'mongoose';
import { asyncHandler, sendResponse } from '../utils/helpers.mjs';

//  get all users
export const getUsers = asyncHandler(async (req, res, next) => {
  try {
    const allUsers = await User.find().select('-password');
    if (!allUsers) {
      return sendResponse(
        res,
        500,
        false,
        'Not found, failed to retrieve all users',
      );
    }
    return sendResponse(res, 200, true, 'All users retrieved', allUsers);
  } catch (error) {
    next(error);
  }
});

// logic to get user by id
export const getUserById = asyncHandler(async (req, res, next) => {
  try {
    const id = new mongoose.Types.ObjectId(req.params.id);
    const oneUser = await User.findById(id).select('-password');
    if (!oneUser) {
      return sendResponse(res, 404, false, 'User not found');
    }

    return sendResponse(res, 200, true, 'User found', oneUser);
  } catch (error) {
    next(error);
  }
});

//  get profile
export const getMyProfile = asyncHandler(async (req, res, next) => {
  try {
    const id = req.user.id || req.user.sub;
    const userProfile = await User.findById(id).select('-password');

    if (!userProfile) {
      return sendResponse(res, 404, false, 'Profile not found');
    }

    return sendResponse(res, 200, true, 'Profile found', userProfile);
  } catch (error) {
    next(error);
  }
});

//  update user profile
export const updateMyProfile = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.id;
  const {
      firstName,
      surname,
      lastName,
      email,
      phone,
      isStudent,
      preferredLocation,
      residentialAddress,
      name,
      budgetMin,
      budgetMax,
      assignedArea,
      commissionRate,
      bankName,
      bankAccountNumber,
      paymentMethod,
    } = req.validatedData || req.body;

    const updates = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (surname !== undefined) updates.surname = surname;
    else if (lastName !== undefined) updates.surname = lastName;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (isStudent !== undefined) updates.isStudent = isStudent;
    if (preferredLocation !== undefined) updates.preferredLocation = preferredLocation;
    if (residentialAddress !== undefined) updates.residentialAddress = residentialAddress;
    if (budgetMin !== undefined) updates.budgetMin = budgetMin;
    if (budgetMax !== undefined) updates.budgetMax = budgetMax;
    if (assignedArea !== undefined) updates.assignedArea = assignedArea;
    if (commissionRate !== undefined) updates.commissionRate = commissionRate;
    if (bankName !== undefined) updates.bankName = bankName;
    if (name && typeof name === 'object') {
      if (name.firstName !== undefined && updates.firstName === undefined) updates.firstName = name.firstName;
      if (name.surname !== undefined && updates.surname === undefined) updates.surname = name.surname;
      if (name.lastName !== undefined && updates.surname === undefined) updates.surname = name.lastName;
    }
    if (residentialAddress && typeof residentialAddress === 'object') {
      const parts = [residentialAddress.village, residentialAddress.traditionalAuthority, residentialAddress.district].filter(Boolean);
      if (parts.length) updates.residentialAddress = parts.join(', ');
    }
    if (Object.keys(updates).length === 0) {
      return sendResponse(res, 400, false, 'Invalid or empty update fields');
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { returnDocument: 'after', runValidators: true },
    ).select('-password');

    if (!updatedUser) {
      return sendResponse(res, 404, false, 'Profile not updated');
    }

    return sendResponse(res, 200, true, 'Profile updated', updatedUser);
  } catch (error) {
    next(error);
  }
});

//  promote user role / change discriminator
export const promoteUser = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.params.id || req.params.sub;
    const { role } = req.body;

    if (!role) {
      return sendResponse(res, 400, false, 'New role not found');
    }

    // Normalize case and validate against the real UserRole enum values.
    const normalizedRole = String(role).toUpperCase();
    const allowedRoles = Object.values(UserRole);

    if (!allowedRoles.includes(normalizedRole)) {
      return sendResponse(res, 400, false, 'Invalid role');
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role: normalizedRole },
      { returnDocument: 'after', runValidators: true },
    ).select('-password');

    if (!user) {
      return sendResponse(res, 404, false, 'User not found');
    }

    return sendResponse(
      res,
      200,
      true,
      `User role changed to ${user.role}`,
      user,
    );
  } catch (error) {
    next(error);
  }
});

//  activate/deactivate a user (admin only)
export const setUserStatus = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return sendResponse(res, 400, false, 'Invalid user ID format');
    }

    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return sendResponse(res, 400, false, 'isActive must be a boolean');
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { returnDocument: 'after', runValidators: true },
    ).select('-password');

    if (!updatedUser) {
      return sendResponse(res, 404, false, 'User not found');
    }

    return sendResponse(
      res,
      200,
      true,
      `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      updatedUser,
    );
  } catch (error) {
    next(error);
  }
});

//  change password (requires current password)
export const changePassword = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.id || req.user._id;
    const { currentPassword, newPassword } = req.validatedData || req.body;

    if (!currentPassword || !newPassword) {
      return sendResponse(res, 400, false, 'currentPassword and newPassword are required');
    }
    if (String(newPassword).length < 6) {
      return sendResponse(res, 400, false, 'New password must be at least 6 characters');
    }

    const user = await User.findById(userId);
    if (!user) {
      return sendResponse(res, 404, false, 'User not found');
    }

    const ok = await user.matchPassword(currentPassword);
    if (!ok) {
      return sendResponse(res, 401, false, 'Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    return sendResponse(res, 200, true, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
});
export const deleteUser = asyncHandler(async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.params.id);
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return sendResponse(res, 404, false, 'User not found');
    }

    return sendResponse(res, 200, true, `User ${userId} deleted successfully`);
  } catch (error) {
    next(error);
  }
});

//  update FCM push token
export const updateFcmToken = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.id;
    const { fcmToken } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { fcmToken: fcmToken || null } },
      { returnDocument: 'after' },
    ).select('-password');

    if (!updatedUser) {
      return sendResponse(res, 404, false, 'User not found');
    }

    return sendResponse(res, 200, true, 'FCM token updated', { fcmToken: updatedUser.fcmToken });
  } catch (error) {
    next(error);
  }
});
