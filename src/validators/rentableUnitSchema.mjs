import Joi from 'joi';
import mongoose from 'mongoose';

export const objectId = Joi.string()
  .custom((value, helpers) => {
    if (!mongoose.isValidObjectId(value)) {
      return helpers.error('any.invalid');
    }
    return value;
  }, 'ObjectId validation')
  .messages({
    'any.invalid': 'Must be a valid MongoDB ObjectId',
  });

export const rentableUnitBase = {
  monthlyRent: Joi.number().min(0).required().messages({
    'any.required': 'Monthly rent is required',
    'number.min': 'Monthly rent cannot be negative',
  }),
  bookingFee: Joi.number().min(0).required().messages({
    'any.required': 'Booking fee is required',
    'number.min': 'Booking fee cannot be negative',
  }),
};
