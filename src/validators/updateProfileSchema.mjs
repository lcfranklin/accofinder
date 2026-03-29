import Joi from 'joi';

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
    .min(1)
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
  .min(1)
  .messages({
    'object.min': 'At least one field (name, email, or residentialAddress) must be provided for update'
  })
  .options({ 
    abortEarly: false,
    stripUnknown: true
  });
