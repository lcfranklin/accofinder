import Joi from 'joi';
import { DisputeStatus } from '../models/enums/DisputeStatus.mjs';

export const updateDisputeSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(DisputeStatus))
    .required()
    .messages({
      'any.only': 'Invalid status. Must be RESOLVED or REJECTED',
      'string.empty': 'Status is required',
      'any.required': 'Status is required',
    }),
});
