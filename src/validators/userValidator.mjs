import Joi from 'joi';  

export const registerUserSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'any.required': 'Name is required',
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters'
    }),

  email: Joi.string()
    .email({ tlds: { allow: true } })   // or { minDomainSegments: 2 } for stricter
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
    }),

  role: Joi.string()
    .valid('agent', 'landlord', 'client', 'student', 'admin')
    .required()                     // usually you want role to be required too
    .messages({
      'any.required': 'Role is required',
      'any.only': 'Invalid role. Allowed roles: agent, landlord, client, student, admin'
    })
})
  .options({ abortEarly: false });   // optional: collect all errors instead of stopping at first