import Joi from 'joi';

export const createRoomSchema = Joi.object({
  propertyId: Joi.string().hex().length(24).required().messages({
    'string.empty': 'propertyId is required',
    'string.length': 'propertyId must be a valid 24-character hex ID',
  }),
  type: Joi.string().trim().uppercase().required().messages({
    'string.empty': 'Room type is required',
  }),
  price: Joi.number().min(0).precision(2).default(0).messages({
    'number.base': 'price must be a number greater than or equal to 0',
    'number.min': 'price must be a number greater than or equal to 0',
    'number.infinity': 'price must be a number greater than or equal to 0',
    'number.precision': 'price must have at most 2 decimal places',
  }),
  bookingFee: Joi.number().min(0).precision(2).default(0).messages({
    'number.base': 'bookingFee must be a number greater than or equal to 0',
    'number.min': 'bookingFee must be a number greater than or equal to 0',
    'number.infinity': 'bookingFee must be a number greater than or equal to 0',
    'number.precision': 'bookingFee must have at most 2 decimal places',
  }),
  rentalFee: Joi.number().min(0).precision(2).optional().messages({
    'number.base': 'rentalFee must be a number greater than or equal to 0',
    'number.min': 'rentalFee must be a number greater than or equal to 0',
    'number.infinity': 'rentalFee must be a number greater than or equal to 0',
    'number.precision': 'rentalFee must have at most 2 decimal places',
  }),
  available: Joi.boolean().default(true),
}).options({ stripUnknown: true });
