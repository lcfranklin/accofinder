import Joi from 'joi';

export const createBookingSchema = Joi.object({
  houseId: Joi.string().hex().length(24).required().messages({
    'any.required': 'House ID is required',
    'string.hex': 'House ID must be a valid MongoDB ObjectId',
    'string.length': 'House ID must be 24 characters',
  }),

  startDate: Joi.date().iso().greater('now').required().messages({
    'any.required': 'Start date is required',
    'date.base': 'Start date must be a valid date',
    'date.greater': 'Start date must be in the future',
    'date.format': 'Start date must be in ISO format (YYYY-MM-DD)',
  }),

  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required().messages({
    'any.required': 'End date is required',
    'date.base': 'End date must be a valid date',
    'date.greater': 'End date must be after start date',
    'date.format': 'End date must be in ISO format (YYYY-MM-DD)',
  }),

  specialNotes: Joi.string().trim().max(500).optional().messages({
    'string.max': 'Special notes cannot exceed 500 characters',
  }),
}).options({ abortEarly: false });
