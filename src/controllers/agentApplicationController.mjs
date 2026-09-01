import { AgentApplication } from '../models/AgentApplication.mjs';
import { User } from '../models/User.mjs';
import { asyncHandler, sendResponse } from '../utils/helpers.mjs';
import mongoose from 'mongoose';

const toApplicationApi = (app) => {
  const u = app.user || {};
  return {
    id: String(app._id),
    applicationId: String(app._id),
    preferredArea: app.preferredArea ?? '',
    appliedDate: app.appliedDate,
    status: app.status,
    notes: app.notes ?? '',
    reason: app.reason ?? '',
    firstName: u.firstName || '',
    lastName: u.surname || '',
    email: u.email || '',
    phone: u.phone || '',
  };
};

export const createAgentApplication = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.id || req.user._id;
    const { preferredArea } = req.body;

    const existing = await AgentApplication.findOne({
      user: userId,
      status: { $in: ['Pending', 'Approved'] },
    });

    if (existing) {
      return sendResponse(
        res,
        409,
        false,
        'You already have a pending or approved agent application',
      );
    }

    const application = await AgentApplication.create({
      user: userId,
      preferredArea: preferredArea || '',
      status: 'Pending',
    });

    const populated = await application.populate(
      'user',
      'firstName surname email phone',
    );

    return sendResponse(
      res,
      201,
      true,
      'Agent application submitted successfully',
      toApplicationApi(populated),
    );
  } catch (error) {
    next(error);
  }
});

export const getAgentApplications = asyncHandler(async (req, res, next) => {
  try {
    const applications = await AgentApplication.find()
      .sort({ appliedDate: -1 })
      .limit(200)
      .populate('user', 'firstName surname email phone');

    return sendResponse(
      res,
      200,
      true,
      'Agent applications retrieved successfully',
      applications.map(toApplicationApi),
    );
  } catch (error) {
    next(error);
  }
});

export const approveAgentApplication = asyncHandler(async (req, res, next) => {
  try {
    const applicationId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return sendResponse(res, 400, false, 'Invalid application ID format');
    }

    const application = await AgentApplication.findById(applicationId);
    if (!application) {
      return sendResponse(res, 404, false, 'Agent application not found');
    }

    application.status = 'Approved';
    await application.save();

    if (application.user) {
      await User.findByIdAndUpdate(application.user, { role: 'AGENT' });
    }

    const populated = await application.populate(
      'user',
      'firstName surname email phone',
    );

    return sendResponse(
      res,
      200,
      true,
      'Agent application approved',
      toApplicationApi(populated),
    );
  } catch (error) {
    next(error);
  }
});

export const rejectAgentApplication = asyncHandler(async (req, res, next) => {
  try {
    const applicationId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return sendResponse(res, 400, false, 'Invalid application ID format');
    }

    const application = await AgentApplication.findById(applicationId);
    if (!application) {
      return sendResponse(res, 404, false, 'Agent application not found');
    }

    const { reason } = req.body;
    application.status = 'Rejected';
    application.reason = (reason ?? '').trim();
    await application.save();

    const populated = await application.populate(
      'user',
      'firstName surname email phone',
    );

    return sendResponse(
      res,
      200,
      true,
      'Agent application rejected',
      toApplicationApi(populated),
    );
  } catch (error) {
    next(error);
  }
});

export const updateAgentApplicationNotes = asyncHandler(async (req, res, next) => {
  try {
    const applicationId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return sendResponse(res, 400, false, 'Invalid application ID format');
    }

    const application = await AgentApplication.findById(applicationId);
    if (!application) {
      return sendResponse(res, 404, false, 'Agent application not found');
    }

    application.notes = (req.body.notes || '').trim();
    await application.save();

    const populated = await application.populate(
      'user',
      'firstName surname email phone',
    );

    return sendResponse(
      res,
      200,
      true,
      'Admin notes updated',
      toApplicationApi(populated),
    );
  } catch (error) {
    next(error);
  }
});