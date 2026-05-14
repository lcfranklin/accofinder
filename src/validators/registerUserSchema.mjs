import Joi from 'joi';

export const registerUserSchema = Joi.object({
  name: Joi.object({
    firstName: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'any.required': 'First name is required',
      'string.empty': 'First name is required',
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 100 characters'
    }),

    surname: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'any.required': 'Surname is required',
      'string.empty': 'Surname is required',
      'string.min': 'Surname must be at least 2 characters long',
      'string.max': 'Surname cannot exceed 100 characters'
    })
  }),

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
    }),

  confirmPassword: Joi.string()
    .min(6)
    .required()
    .messages({
      'any.required': 'Confirm password is required',
      'string.empty': 'Confirm password is required',
      'string.min': 'Confirm password must be at least 6 characters long'
    }),

  residentialAddress: Joi.object({
    district: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
      .messages({
        'any.required': 'District is required',
        'string.empty': 'District is required',
        'string.min': 'District must be at least 2 characters long'
      }),

    traditionalAuthority: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
      .messages({
        'any.required': 'Traditional Authority is required',
        'string.empty': 'Traditional Authority is required',
        'string.min': 'Traditional Authority must be at least 2 characters long'
      }),

    village: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
      .messages({
        'any.required': 'Village is required',
        'string.empty': 'Village is required',
        'string.min': 'Village must be at least 2 characters long'
      })
  })
    .required()                    
    .messages({
      'any.required': 'Residential address is required'
    })

}).options({ abortEarly: false });
