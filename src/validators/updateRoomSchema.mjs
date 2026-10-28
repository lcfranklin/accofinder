import Joi from 'joi';

export const updateRoomSchema = Joi.object({
  type: Joi.string().trim().uppercase().optional(),
  bookingFee: Joi.number().min(0).precision(2).optional().messages({
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
  price: Joi.number().min(0).precision(2).optional().messages({
    'number.base': 'price must be a number greater than or equal to 0',
    'number.min': 'price must be a number greater than or equal to 0',
    'number.infinity': 'price must be a number greater than or equal to 0',
    'number.precision': 'price must have at most 2 decimal places',
  }),
  available: Joi.boolean().optional(),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided to update the room',
  });
