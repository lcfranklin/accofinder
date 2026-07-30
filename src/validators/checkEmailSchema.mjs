import Joi from 'joi';

export const checkEmailSchema = Joi.object({
  email: Joi.string().email().required().trim().messages({
    'string.email': 'Please provide a valid email address.',
    'any.required': 'Email is required.',
  }),
});
