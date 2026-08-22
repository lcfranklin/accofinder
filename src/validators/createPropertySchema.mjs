import Joi from 'joi';
import { PropertyType } from '../models/enums/PropertyType.mjs';

export const createPropertySchema = Joi.object({
  title: Joi.string().trim().min(3).max(100).required().messages({
    'string.empty': 'Property title is required',
    'string.min': 'Property title must be at least 3 characters',
  }),
  description: Joi.string().trim().min(10).max(2000).optional(),
  type: Joi.string()
    .valid(...Object.values(PropertyType))
    .required()
    .messages({
      'any.only': 'Invalid property type',
      'string.empty': 'Property type is required',
    }),
  landlordId: Joi.string().hex().length(24).optional().messages({
    'string.length': 'landlordId must be a valid 24-character hex ID',
  }),
  agentId: Joi.string().hex().length(24).optional().messages({
    'string.length': 'agentId must be a valid 24-character hex ID',
  }),
  location: Joi.object({
    address: Joi.string().trim().required().messages({
      'string.empty': 'Street address is required',
    }),
    city: Joi.string().trim().required().messages({
      'string.empty': 'City is required',
    }),
    district: Joi.string().trim().optional(),
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
  })
    .required()
    .messages({
      'any.required': 'Location details are required',
    }),
  amenities: Joi.array().items(Joi.string().trim()).default([]),
  rules: Joi.array().items(Joi.string().trim()).default([]),
  images: Joi.array().items(Joi.string().uri()).default([]),
});
