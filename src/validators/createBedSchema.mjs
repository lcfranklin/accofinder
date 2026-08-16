import Joi from 'joi';
import { objectId, rentableUnitBase } from './rentableUnitSchema.mjs';

export const createBedSchema = Joi.object({
  ...rentableUnitBase,

  bedNumber: Joi.string().trim().required().messages({
    'any.required': 'Bed number is required',
  }),

  room: objectId.required().messages({
    'any.required': 'Room ID is required',
  }),

  bedType: Joi.string()
    .valid('SINGLE', 'DOUBLE', 'BUNK_TOP', 'BUNK_BOTTOM')
    .optional()
    .messages({
      'any.only':
        'Bed type must be one of SINGLE, DOUBLE, BUNK_TOP, or BUNK_BOTTOM',
    }),
})
  .options({ abortEarly: false })
  .unknown(false);
