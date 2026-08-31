import Joi from 'joi';
import { RoomType } from '../models/enums/RoomType.mjs';

export const queryRoomSchema = Joi.object({
  propertyId: Joi.string().hex().length(24).optional(),
  roomType: Joi.string()
    .valid(...Object.values(RoomType))
    .insensitive()
    .optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  isAvailable: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});
