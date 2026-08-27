import Joi from 'joi';
import { PropertyType } from '../models/enums/PropertyType.mjs';

export const updatePropertySchema = Joi.object({
  title: Joi.string().trim().min(3).max(100).optional(),
  description: Joi.string().trim().min(10).max(2000).optional(),
  type: Joi.string()
    .valid(...Object.values(PropertyType))
    .optional(),
  landlordId: Joi.string().hex().length(24).optional(),
  agentId: Joi.string().hex().length(24).optional(),
  location: Joi.object({
    address: Joi.string().trim().optional(),
    city: Joi.string().trim().optional(),
    district: Joi.string().trim().optional(),
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
  }).optional(),
  amenities: Joi.array().items(Joi.string().trim()).optional(),
  rules: Joi.array().items(Joi.string().trim()).optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  isAvailable: Joi.boolean().optional(),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided to update the property',
  });
