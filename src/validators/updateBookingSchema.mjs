import Joi from 'joi';

export const updateBookingSchema = Joi.object({
  startDate: Joi.date().iso().greater('now').messages({
    'date.base': 'Start date must be a valid date',
    'date.greater': 'Start date must be in the future',
    'date.format': 'Start date must be in ISO format (YYYY-MM-DD)',
  }),

  endDate: Joi.date()
    .iso()
    .when('startDate', {
      is: Joi.exist(),
      then: Joi.date().greater(Joi.ref('startDate')),
      otherwise: Joi.date().greater('now'),
    })
    .messages({
      'date.base': 'End date must be a valid date',
      'date.greater': 'End date must be after start date',
      'date.format': 'End date must be in ISO format (YYYY-MM-DD)',
    }),

  specialNotes: Joi.string().trim().max(500).messages({
    'string.max': 'Special notes cannot exceed 500 characters',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided to update',
  })
  .options({ abortEarly: false });
