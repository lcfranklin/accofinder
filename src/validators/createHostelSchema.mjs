import Joi from 'joi';
import { objectId, rentableUnitBase } from './rentableUnitSchema.mjs';

export const createHostelSchema = Joi.object({
  ...rentableUnitBase,

  property: objectId.required().messages({
    'any.required': 'Property ID is required',
  }),

  title: Joi.string().trim().required().messages({
    'any.required': 'Title is required',
  }),

  description: Joi.string().trim().optional(),

  gender: Joi.string().valid('male', 'female', 'mixed').optional().messages({
    'any.only': 'Gender must be one of male, female, or mixed',
  }),

  totalRooms: Joi.number().integer().min(1).required().messages({
    'any.required': 'Total rooms is required',
    'number.min': 'Total rooms must be at least 1',
  }),

  totalBeds: Joi.number().integer().min(1).required().messages({
    'any.required': 'Total beds is required',
    'number.min': 'Total beds must be at least 1',
  }),

  amenities: Joi.array()
    .items(
      Joi.string().valid(
        'WIFI',
        'PARKING',
        'SECURITY',
        'WATER',
        'ELECTRICITY',
        'COMMON_AREA',
        'LAUNDRY',
        'CCTV',
      ),
    )
    .optional(),

  rules: Joi.array().items(Joi.string().trim()).optional(),

  isActive: Joi.boolean().optional(),
})
  .options({ abortEarly: false })
  .unknown(false);
