import Joi from 'joi';
import { RoomType } from '../models/enums/RoomType.mjs';

export const createRoomSchema = Joi.object({
  propertyId: Joi.string().hex().length(24).required().messages({
    'string.empty': 'propertyId is required',
    'string.length': 'propertyId must be a valid 24-character hex ID',
  }),
  roomType: Joi.string()
    .valid(...Object.values(RoomType))
    .required()
    .messages({
      'any.only': 'Invalid room type',
      'string.empty': 'Room type is required',
    }),
  title: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Room title is required',
    'string.min': 'Room title must be at least 2 characters',
  }),
  price: Joi.number().positive().required().messages({
    'number.base': 'Price must be a number',
    'number.positive': 'Price must be greater than 0',
    'any.required': 'Price is required',
  }),
  capacity: Joi.number().integer().min(1).default(1).messages({
    'number.min': 'Capacity must be at least 1',
  }),
  occupiedBeds: Joi.number().integer().min(0).default(0),
  isAvailable: Joi.boolean().default(true),
  images: Joi.array().items(Joi.string().uri()).default([]),
});
