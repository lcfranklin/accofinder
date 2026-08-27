import Joi from 'joi';

export const createBookingSchema = Joi.object({
  roomId: Joi.string().hex().length(24).required().messages({
    'string.empty': 'roomId is required',
    'string.length': 'roomId must be a valid 24-character hex ID',
  }),
  clientId: Joi.string().hex().length(24).optional().messages({
    'string.length': 'clientId must be a valid 24-character hex ID',
  }),
  checkInDate: Joi.date().iso().greater('now').required().messages({
    'date.base': 'Check-in date must be a valid date',
    'date.greater': 'Check-in date must be in the future',
    'any.required': 'Check-in date is required',
  }),
  checkOutDate: Joi.date()
    .iso()
    .greater(Joi.ref('checkInDate'))
    .required()
    .messages({
      'date.base': 'Check-out date must be a valid date',
      'date.greater': 'Check-out date must be after the check-in date',
      'any.required': 'Check-out date is required',
    }),
  amount: Joi.number().positive().required().messages({
    'number.base': 'Amount must be a number',
    'number.positive': 'Amount must be greater than 0',
    'any.required': 'Amount is required',
  }),
  commissionAmount: Joi.number().min(0).default(0),
});
