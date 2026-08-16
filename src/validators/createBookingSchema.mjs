import Joi from 'joi';
import mongoose from 'mongoose';

const objectId = Joi.string()
  .custom((value, helpers) => {
    if (!mongoose.isValidObjectId(value)) {
      return helpers.error('any.invalid');
    }
    return value;
  }, 'ObjectId validation')
  .messages({
    'any.invalid': 'Must be a valid MongoDB ObjectId',
  });

export const createBookingSchema = Joi.object({
  unitId: objectId.required().messages({
    'any.required': 'Unit ID is required',
  }),

  unitType: Joi.string().valid('House', 'Room', 'Bed').required().messages({
    'any.required': 'Unit type is required',
    'any.only': 'Unit type must be one of House, Room, or Bed',
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
})
  .options({ abortEarly: false, stripUnknown: false, presence: 'required' })
  .unknown(false);
