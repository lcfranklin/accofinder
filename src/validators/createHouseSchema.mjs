import Joi from 'joi';
import { objectId, rentableUnitBase } from './rentableUnitSchema.mjs';

export const createHouseSchema = Joi.object({
  ...rentableUnitBase,

  property: objectId.required().messages({
    'any.required': 'Property ID is required',
  }),

  title: Joi.string().trim().max(200).required().messages({
    'any.required': 'Title is required',
    'string.max': 'Title cannot exceed 200 characters',
  }),

  description: Joi.string().trim().max(2000).optional(),

  costCategory: Joi.string()
    .valid('Low_Cost', 'Medium_Cost', 'High_Cost')
    .required()
    .messages({
      'any.required': 'Cost category is required',
      'any.only':
        'Cost category must be one of Low_Cost, Medium_Cost, or High_Cost',
    }),

  numberOfRooms: Joi.number().integer().min(1).required().messages({
    'any.required': 'Number of rooms is required',
    'number.min': 'Number of rooms must be at least 1',
  }),

  numberOfBathrooms: Joi.number().integer().min(1).required().messages({
    'any.required': 'Number of bathrooms is required',
    'number.min': 'Number of bathrooms must be at least 1',
  }),

  floorNumber: Joi.number().integer().min(0).optional(),

  hasLivingRoom: Joi.boolean().optional(),
  hasKitchen: Joi.boolean().optional(),

  squareFootage: Joi.number().min(0).optional(),

  //omitted owner for now
})
  .options({ abortEarly: false })
  .unknown(false);
