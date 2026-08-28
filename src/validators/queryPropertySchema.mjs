import Joi from 'joi';
import { PropertyType } from '../models/enums/PropertyType.mjs';

export const queryPropertySchema = Joi.object({
  propertyType: Joi.string()
    .valid(...Object.values(PropertyType))
    .uppercase()
    .optional(),
  district: Joi.string().trim().optional(),
  village: Joi.string().trim().optional(),
  amenities: Joi.alternatives()
    .try(Joi.array().items(Joi.string().trim()), Joi.string().trim())
    .optional(),
  isActive: Joi.boolean().optional(),
  search: Joi.string().trim().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string()
    .valid('createdAt', 'title', 'propertyType', 'price')
    .default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});
