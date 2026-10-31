import Joi from 'joi';

export const createReviewSchema = Joi.object({
  propertyId: Joi.string().hex().length(24).required().messages({
    'string.empty': 'propertyId is required',
    'string.length': 'propertyId must be a valid 24-character hex ID',
    'any.required': 'propertyId is required',
  }),
  agentId: Joi.string().hex().length(24).optional().allow(null, ''),
  bookingId: Joi.string().hex().length(24).optional().allow(null, ''),
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.base': 'rating must be a number',
    'number.min': 'rating must be at least 1',
    'number.max': 'rating must be at most 5',
    'any.required': 'rating is required',
  }),
  comment: Joi.string().trim().min(1).max(2000).required().messages({
    'string.empty': 'comment is required',
    'any.required': 'comment is required',
  }),
}).options({ abortEarly: false });

export const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional(),
  comment: Joi.string().trim().min(1).max(2000).optional(),
}).options({ abortEarly: false });

export const queryReviewSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});