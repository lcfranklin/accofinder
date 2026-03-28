import Joi from 'joi';  

/**
 * Register User Validation Schema
 */
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

})
  .options({ abortEarly: false }); 

  /**
 * Login User Validation Schema
 * Validates email and password for user authentication
 */
export const  loginUserSchema= Joi.object({

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
})

/**
 * Update Profile Schema validator
 */
export const updateProfileSchema = Joi.object({
  name: Joi.object({
    firstName: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .messages({
        'string.empty': 'First name cannot be empty',
        'string.min': 'First name must be at least 2 characters long',
        'string.max': 'First name cannot exceed 100 characters'
      }),

    surname: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .messages({
        'string.empty': 'Surname cannot be empty',
        'string.min': 'Surname must be at least 2 characters long',
        'string.max': 'Surname cannot exceed 100 characters'
      })
  })
    .min(1)                    // At least one field in name must be provided if name is sent
    .messages({
      'object.min': 'Name object must contain at least one field (firstName or surname)'
    }),

  email: Joi.string()
    .email({ tlds: { allow: true } })
    .trim()
    .lowercase()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email cannot be empty'
    }),

  residentialAddress: Joi.object({
    district: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .messages({
        'string.empty': 'District cannot be empty',
        'string.min': 'District must be at least 2 characters long',
        'string.max': 'District cannot exceed 100 characters'
      }),

    traditionalAuthority: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .messages({
        'string.empty': 'Traditional Authority cannot be empty',
        'string.min': 'Traditional Authority must be at least 2 characters long',
        'string.max': 'Traditional Authority cannot exceed 100 characters'
      }),

    village: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .messages({
        'string.empty': 'Village cannot be empty',
        'string.min': 'Village must be at least 2 characters long',
        'string.max': 'Village cannot exceed 100 characters'
      })
  })
    .min(1)
    .messages({
      'object.min': 'Residential address must contain at least one field'
    })

})
  .min(1)                       // At least one top-level field must be provided
  .messages({
    'object.min': 'At least one field (name, email, or residentialAddress) must be provided for update'
  })
  .options({ 
    abortEarly: false,
    stripUnknown: true          // ← Important: removes unknown fields (e.g. role, password)
  });