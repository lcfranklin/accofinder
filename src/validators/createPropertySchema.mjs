import Joi from 'joi';
import { PropertyType } from '../models/enums/PropertyType.mjs';

const roomSchema = Joi.object({
  type: Joi.string().trim().required().messages({
    'string.empty': 'Room type is required',
  }),
  price: Joi.number().min(0).default(0),
  available: Joi.boolean().default(true),
});

export const createPropertySchema = Joi.object({
  title: Joi.string().trim().min(3).max(100).required().messages({
    'string.empty': 'Property title is required',
    'string.min': 'Property title must be at least 3 characters',
  }),

  description: Joi.string().trim().min(10).max(2000).optional(),

  price: Joi.number().min(0).default(0),

  propertyType: Joi.string()
    .valid(...Object.values(PropertyType))
    .uppercase()
    .default(PropertyType.WHOLE)
    .messages({
      'any.only': `Invalid property type. Valid values: ${Object.values(PropertyType).join(', ')}`,
    }),

  physicalAddress: Joi.object({
    district: Joi.string().trim().optional(),
    village: Joi.string().trim().optional(),
  }).optional(),

  verificationStatus: Joi.string()
    .valid('PENDING', 'VERIFIED', 'DRAFT')
    .default('PENDING'),

  amenities: Joi.array().items(Joi.string().trim()).default([]),

  landlord: Joi.string().trim().optional(),
  landlordPhone: Joi.string().trim().optional(),

  isActive: Joi.boolean().default(true),

  rooms: Joi.array().items(roomSchema).default([]),
});
