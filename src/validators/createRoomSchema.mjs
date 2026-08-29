import Joi from 'joi';

export const createRoomSchema = Joi.object({
  propertyId: Joi.string().hex().length(24).required().messages({
    'string.empty': 'propertyId is required',
    'string.length': 'propertyId must be a valid 24-character hex ID',
  }),
  type: Joi.string().trim().uppercase().required().messages({
    'string.empty': 'Room type is required',
  }),
  price: Joi.number().min(0).default(0).messages({
    'number.base': 'Price must be a number',
  }),
  available: Joi.boolean().default(true),
});
