import Joi from 'joi';

export const createDisputeSchema = Joi.object({
  bookingId: Joi.string().hex().length(24).required().messages({
    'string.empty': 'bookingId is required',
    'string.length': 'bookingId must be a valid 24-character hex ID',
    'any.required': 'bookingId is required',
  }),
  issue: Joi.string().trim().min(10).max(1000).required().messages({
    'string.empty': 'Issue description is required',
    'string.min': 'Issue description must be at least 10 characters long',
    'any.required': 'Issue description is required',
  }),
});
