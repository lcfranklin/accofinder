import Joi from 'joi';
import { DisputeStatus } from '../models/enums/DisputeStatus.mjs';

export const queryDisputeSchema = Joi.object({
  bookingId: Joi.string().hex().length(24).optional(),
  raisedBy: Joi.string().hex().length(24).optional(),
  status: Joi.string()
    .valid(...Object.values(DisputeStatus))
    .optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});
