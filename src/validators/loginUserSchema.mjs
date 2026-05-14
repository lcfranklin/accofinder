import Joi from 'joi';

export const loginUserSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: true } })   
    .trim()
    .lowercase()
    .required()
    .messages({
      'any.required': 'Valid email is required',
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required'
    }),

  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'any.required': 'Password is required',
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 6 characters long'
    })
});
