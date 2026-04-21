import Joi from 'joi';

export const updateHouseSchema = Joi.object({
  title: Joi.string().trim().min(3).max(255).messages({
    'string.empty': 'Title cannot be empty',
    'string.min': 'Title must be at least 3 characters long',
    'string.max': 'Title cannot exceed 255 characters',
  }),

  description: Joi.string().trim().max(1000).messages({
    'string.max': 'Description cannot exceed 1000 characters',
  }),

  price: Joi.number().positive().messages({
    'number.base': 'Price must be a number',
    'number.positive': 'Price must be a positive number',
  }),

  costCategory: Joi.string()
    .valid('Low_Cost', 'Medium_Cost', 'High_Cost')
    .messages({
      'any.only':
        'Cost category must be one of Low_Cost, Medium_Cost, or High_Cost',
    }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided to update',
  })
  .options({ abortEarly: false });
