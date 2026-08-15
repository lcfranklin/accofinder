import Joi from 'joi';

export const registerUserSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(100).required().messages({
    'any.required': 'First name is required',
    'string.empty': 'First name is required',
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name cannot exceed 100 characters',
  }),
  surname: Joi.string().trim().min(2).max(100).required().messages({
      'any.required': 'Surname is required',
      'string.empty': 'Surname is required',
      'string.min': 'Surname must be at least 2 characters long',
      'string.max': 'Surname cannot exceed 100 characters',
    }),

  email: Joi.string()
    .email({ tlds: { allow: true } })
    .trim()
    .lowercase()
    .required()
    .messages({
      'any.required': 'Valid email is required',
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
    }),

  password: Joi.string().min(6).required().messages({
    'any.required': 'Password is required',
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 6 characters long',
  }),

  confirmPassword: Joi.string().min(6).required().messages({
    'any.required': 'Confirm password is required',
    'string.empty': 'Confirm password is required',
    'string.min': 'Confirm password must be at least 6 characters long',
  }),

  residentialAddress: Joi.string().trim().min(2).max(100).required().messages({
    'any.required': 'Address is required',
    'string.empty': 'Address is required',
    'string.min': 'Address must be at least 2 characters long',
  }),
}).options({ abortEarly: false });
