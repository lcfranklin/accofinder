import { User } from '../models/User.mjs';
import { asyncHandler, sendResponse } from '../utils/helpers.mjs';
import mongoose from 'mongoose';

// Shape the user document the way the mobile app expects for agent records
// (employeeId, assignedArea, commissionRate, isActive, firstName, lastName,
// email, phone, createdAt).
const toAgentApi = (u) => ({
  id: String(u._id),
  employeeId: String(u._id),
  assignedArea: u.assignedArea ?? '',
  commissionRate: u.commissionRate ?? 0,
  isActive: u.isActive,
  firstName: u.firstName,
  lastName: u.surname,
  email: u.email,
  phone: u.phone,
  createdAt: u.createdAt,
});

export const getAgents = asyncHandler(async (req, res, next) => {
  try {
    const agents = await User.find({ role: 'AGENT' })
      .select('-password')
      .sort({ createdAt: -1 });

    return sendResponse(
      res,
      200,
      true,
      'Agents retrieved successfully',
      agents.map(toAgentApi),
    );
  } catch (error) {
    next(error);
  }
});

export const getAgentById = asyncHandler(async (req, res, next) => {
  try {
    const agentId = req.params.agentId || req.params.id;

    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return sendResponse(res, 400, false, 'Invalid agent ID format');
    }

    const agent = await User.findOne({
      _id: agentId,
      role: 'AGENT',
    }).select('-password');

    if (!agent) {
      return sendResponse(res, 404, false, 'Agent not found');
    }

    return sendResponse(
      res,
      200,
      true,
      'Agent retrieved successfully',
      toAgentApi(agent),
    );
  } catch (error) {
    next(error);
  }
});

export const updateAgent = asyncHandler(async (req, res, next) => {
  try {
    const agentId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return sendResponse(res, 400, false, 'Invalid agent ID format');
    }

    const { assignedArea, commissionRate } = req.body;
    const updates = { assignedArea, commissionRate };

    Object.keys(updates).forEach(
      (key) => updates[key] === undefined && delete updates[key],
    );

    if (Object.keys(updates).length === 0) {
      return sendResponse(res, 400, false, 'Invalid or empty update fields');
    }

    const updated = await User.findOneAndUpdate(
      { _id: agentId, role: 'AGENT' },
      { $set: updates },
      { returnDocument: 'after', runValidators: true },
    ).select('-password');

    if (!updated) {
      return sendResponse(res, 404, false, 'Agent not found');
    }

    return sendResponse(
      res,
      200,
      true,
      'Agent updated successfully',
      toAgentApi(updated),
    );
  } catch (error) {
    next(error);
  }
});

export const setAgentActive = asyncHandler(async (req, res, next) => {
  try {
    const agentId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return sendResponse(res, 400, false, 'Invalid agent ID format');
    }

    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return sendResponse(res, 400, false, 'isActive must be a boolean');
    }

    const updated = await User.findOneAndUpdate(
      { _id: agentId, role: 'AGENT' },
      { isActive },
      { returnDocument: 'after', runValidators: true },
    ).select('-password');

    if (!updated) {
      return sendResponse(res, 404, false, 'Agent not found');
    }

    return sendResponse(
      res,
      200,
      true,
      `Agent ${isActive ? 'activated' : 'deactivated'} successfully`,
      toAgentApi(updated),
    );
  } catch (error) {
    next(error);
  }
});