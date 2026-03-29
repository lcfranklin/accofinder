import Joi from 'joi';

export const createHouseSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(3)
    .max(255)
    .required()
    .messages({
      'any.required': 'Title is required',
      'string.empty': 'Title cannot be empty',
      'string.min': 'Title must be at least 3 characters long',
      'string.max': 'Title cannot exceed 255 characters'
    }),

  description: Joi.string()
    .trim()
    .max(1000)
    .messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),

  price: Joi.number()
    .positive()
    .required()
    .messages({
      'any.required': 'Price is required',
      'number.base': 'Price must be a number',
      'number.positive': 'Price must be a positive number'
    }),

  costCategory: Joi.string()
    .valid('Low_Cost', 'Medium_Cost', 'High_Cost')
    .required()
    .messages({
      'any.required': 'Cost category is required',
      'any.only': 'Cost category must be one of Low_Cost, Medium_Cost, or High_Cost'
    })
}).options({ abortEarly: false });
