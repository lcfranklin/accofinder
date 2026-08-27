import Joi from 'joi';
import { RoomType } from '../models/enums/RoomType.mjs';

export const updateRoomSchema = Joi.object({
  roomType: Joi.string()
    .valid(...Object.values(RoomType))
    .optional(),
  title: Joi.string().trim().min(2).max(100).optional(),
  price: Joi.number().positive().optional(),
  capacity: Joi.number().integer().min(1).optional(),
  occupiedBeds: Joi.number().integer().min(0).optional(),
  isAvailable: Joi.boolean().optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided to update the room',
  });
