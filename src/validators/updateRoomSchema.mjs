import Joi from 'joi';

export const updateRoomSchema = Joi.object({
  type: Joi.string().trim().optional(),
  price: Joi.number().min(0).optional().messages({
    'number.base': 'Price must be a number',
  }),
  available: Joi.boolean().optional(),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided to update the room',
  });
