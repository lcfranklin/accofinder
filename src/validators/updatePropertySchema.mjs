import Joi from 'joi';
import { PropertyType } from '../models/enums/PropertyType.mjs';

export const updatePropertySchema = Joi.object({
  title: Joi.string().trim().min(3).max(100).optional(),
  description: Joi.string().trim().min(10).max(2000).optional(),
  bookingFee: Joi.number().min(0).precision(2).optional().messages({
    'number.base': 'bookingFee must be a number greater than or equal to 0',
    'number.min': 'bookingFee must be a number greater than or equal to 0',
    'number.infinity': 'bookingFee must be a number greater than or equal to 0',
    'number.precision': 'bookingFee must have at most 2 decimal places',
  }),
  rentalFee: Joi.number().min(0).precision(2).optional().messages({
    'number.base': 'rentalFee must be a number greater than or equal to 0',
    'number.min': 'rentalFee must be a number greater than or equal to 0',
    'number.infinity': 'rentalFee must be a number greater than or equal to 0',
    'number.precision': 'rentalFee must have at most 2 decimal places',
  }),

  propertyType: Joi.string()
    .valid(...Object.values(PropertyType))
    .uppercase()
    .optional(),

  physicalAddress: Joi.object({
    district: Joi.string().trim().optional(),
    village: Joi.string().trim().optional(),
  }).optional(),

  verificationStatus: Joi.string()
    .valid('PENDING', 'VERIFIED', 'REJECTED', 'DRAFT')
    .optional(),

  verificationReason: Joi.string().trim().max(1000).optional(),

  approvedBy: Joi.string().hex().length(24).optional().messages({
    'string.length': 'approvedBy must be a valid 24-character hex ObjectId',
  }),
  approvedByName: Joi.string().trim().max(100).optional(),

  amenities: Joi.array().items(Joi.string().trim()).optional(),
  landlord: Joi.string().trim().optional(),
  landlordPhone: Joi.string().trim().optional(),
  isActive: Joi.boolean().optional(),

  media: Joi.array()
    .items(Joi.string().hex().length(24))
    .optional()
    .messages({
      'string.length': 'Each media ID must be a valid 24-character hex ObjectId',
    }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided to update the property',
  });
