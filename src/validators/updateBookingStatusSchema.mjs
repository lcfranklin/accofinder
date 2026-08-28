import Joi from 'joi';
import { BookingStatus } from '../models/enums/BookingStatus.mjs';

export const updateBookingStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(BookingStatus))
    .required()
    .messages({
      'any.only': 'Invalid booking status',
      'string.empty': 'Status is required',
    }),
});
