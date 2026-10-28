import Joi from 'joi';

export const createBookingSchema = Joi.object({
  bookableItemId: Joi.string().hex().length(24).required().messages({
    'any.required': 'bookableItemId is required',
    'string.length': 'bookableItemId must be a valid 24-character hex ID',
  }),
  clientId: Joi.string().hex().length(24).optional().messages({
    'string.length': 'clientId must be a valid 24-character hex ID',
  }),
  bookableItemType: Joi.string().valid('Room', 'Property').optional(),
  bookingDate: Joi.date().iso().optional().messages({
    'date.base': 'Booking date must be a valid date',
  }),
  amount: Joi.number().positive().required().messages({
    'number.base': 'Amount must be a number',
    'number.positive': 'Amount must be greater than 0',
    'any.required': 'Amount is required',
  }),
  commissionAmount: Joi.number().min(0).default(0),
});
