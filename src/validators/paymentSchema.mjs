import Joi from 'joi';

export const processMobilePaymentSchema = Joi.object({
  phoneNumber: Joi.string()
    .required()
    .messages({
      'any.required': 'Phone number is required',
      'string.empty': 'Phone number cannot be empty'
    }),
  bookingId: Joi.string()
    .required()
    .messages({
      'any.required': 'Booking ID is required',
      'string.empty': 'Booking ID cannot be empty'
    }),
  amount: Joi.alternatives().try(Joi.number(), Joi.string())
    .required()
    .messages({
      'any.required': 'Amount is required',
      'string.empty': 'Amount cannot be empty'
    }),
  operatorRefId: Joi.string()
    .required()
    .messages({
      'any.required': 'Operator Reference ID is required',
      'string.empty': 'Operator Reference ID cannot be empty'
    })
});
