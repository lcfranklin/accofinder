import Joi from 'joi';
import { BookingStatus } from '../models/enums/BookingStatus.mjs';

export const queryBookingSchema = Joi.object({
  roomId: Joi.string().hex().length(24).optional(),
  clientId: Joi.string().hex().length(24).optional(),
  status: Joi.string()
    .valid(...Object.values(BookingStatus))
    .optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});
