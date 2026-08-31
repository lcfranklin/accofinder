import Joi from 'joi';
import { PaymentStatus } from '../models/enums/PaymentStatus.mjs';

export const processMobilePaymentSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^[+]*[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
    .optional()
    .messages({
      'string.empty': 'Phone number cannot be empty',
      'string.pattern.base': 'Please enter a valid phone number',
    }),
  bookingId: Joi.string().hex().length(24).required().messages({
    'any.required': 'Booking ID is required',
    'string.empty': 'Booking ID cannot be empty',
    'string.length': 'Booking ID must be a valid 24-character hex ID',
  }),
  amount: Joi.alternatives()
    .try(Joi.number().positive(), Joi.string().trim())
    .required()
    .messages({
      'any.required': 'Amount is required',
      'string.empty': 'Amount cannot be empty',
    }),
  operatorRefId: Joi.string().optional().messages({
    'string.empty': 'Operator Reference ID cannot be empty',
  }),
});

export const verifyPaymentSchema = Joi.object({
  chargeId: Joi.string().required().messages({
    'any.required': 'Charge ID is required',
    'string.empty': 'Charge ID cannot be empty',
  }),
});

export const queryPaymentSchema = Joi.object({
  bookingId: Joi.string().hex().length(24).optional(),
  status: Joi.string()
    .valid(...Object.values(PaymentStatus))
    .optional(),
  paymentMethod: Joi.string().trim().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});
