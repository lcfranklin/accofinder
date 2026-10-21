import Joi from 'joi';

export const updatePlatformSettingSchema = Joi.object({
  bookingFee: Joi.number().min(0).optional().messages({
    'number.base': 'Booking fee must be a number',
    'number.min': 'Booking fee cannot be negative',
  }),
  commissionRate: Joi.number().min(0).max(100).optional().messages({
    'number.base': 'Commission rate must be a number',
    'number.min': 'Commission rate cannot be negative',
    'number.max': 'Commission rate cannot exceed 100',
  }),
}).min(1).messages({
  'object.min': 'Provide at least one setting to update',
});
