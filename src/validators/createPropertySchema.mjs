import Joi from 'joi';
import { PropertyType } from '../models/enums/PropertyType.mjs';

const roomSchema = Joi.object({
  type: Joi.string().trim().uppercase().required().messages({
    'string.empty': 'Room type is required',
  }),
  bookingFee: Joi.number().min(0).precision(2).optional().messages({
    'number.base': 'room bookingFee must be a number greater than or equal to 0',
    'number.min': 'room bookingFee must be a number greater than or equal to 0',
    'number.infinity': 'room bookingFee must be a number greater than or equal to 0',
    'number.precision': 'room bookingFee must have at most 2 decimal places',
  }),
  rentalFee: Joi.number().min(0).precision(2).optional().messages({
    'number.base': 'room rentalFee must be a number greater than or equal to 0',
    'number.min': 'room rentalFee must be a number greater than or equal to 0',
    'number.infinity': 'room rentalFee must be a number greater than or equal to 0',
    'number.precision': 'room rentalFee must have at most 2 decimal places',
  }),
  price: Joi.number().min(0).precision(2).optional().messages({
    'number.base': 'price must be a number greater than or equal to 0',
    'number.min': 'price must be a number greater than or equal to 0',
    'number.infinity': 'price must be a number greater than or equal to 0',
    'number.precision': 'price must have at most 2 decimal places',
  }),
  available: Joi.boolean().default(true),
});

export const createPropertySchema = Joi.object({
  title: Joi.string().trim().min(3).max(100).required().messages({
    'string.empty': 'Property title is required',
    'string.min': 'Property title must be at least 3 characters',
  }),

  description: Joi.string().trim().min(10).max(2000).optional(),

  bookingFee: Joi.number().min(0).precision(2).default(0).messages({
    'number.base': 'bookingFee must be a number greater than or equal to 0',
    'number.min': 'bookingFee must be a number greater than or equal to 0',
    'number.infinity': 'bookingFee must be a number greater than or equal to 0',
    'number.precision': 'bookingFee must have at most 2 decimal places',
  }),
  rentalFee: Joi.number().min(0).precision(2).default(0).messages({
    'number.base': 'rentalFee must be a number greater than or equal to 0',
    'number.min': 'rentalFee must be a number greater than or equal to 0',
    'number.infinity': 'rentalFee must be a number greater than or equal to 0',
    'number.precision': 'rentalFee must have at most 2 decimal places',
  }),

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
    .valid('PENDING', 'VERIFIED', 'REJECTED', 'DRAFT')
    .default('PENDING'),

  amenities: Joi.array().items(Joi.string().trim()).default([]),

  landlord: Joi.string().trim().optional(),
  landlordPhone: Joi.string().trim().optional(),

  isActive: Joi.boolean().default(true),

  rooms: Joi.array().items(roomSchema).default([]),
});
