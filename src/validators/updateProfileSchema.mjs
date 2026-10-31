import Joi from 'joi';

const nameObject = Joi.object({
  firstName: Joi.string().trim().min(2).max(100),
  surname: Joi.string().trim().min(2).max(100),
  lastName: Joi.string().trim().min(2).max(100),
}).min(1);

const addressObject = Joi.object({
  district: Joi.string().trim().min(2).max(100),
  traditionalAuthority: Joi.string().trim().min(2).max(100),
  village: Joi.string().trim().min(2).max(100),
}).min(1);

export const updateProfileSchema = Joi.object({
  // Top-level fields (used by the Qt client)
  firstName: Joi.string().trim().min(2).max(100),
  surname: Joi.string().trim().min(2).max(100),
  lastName: Joi.string().trim().min(2).max(100),
  email: Joi.string().email({ tlds: { allow: true } }).trim().lowercase(),
  phone: Joi.string().trim().min(10).max(16),
  preferredLocation: Joi.string().trim().max(200).allow(''),
  residentialAddress: Joi.alternatives().try(Joi.string().trim().max(300).allow(''), addressObject),

  // Nested shape (legacy/other clients)
  name: nameObject,

  isStudent: Joi.boolean(),
  budgetMin: Joi.number().min(0),
  budgetMax: Joi.number().min(0),
  assignedArea: Joi.string().trim().max(200).allow(''),
  commissionRate: Joi.number().min(0).max(100),
  bankName: Joi.string().trim().allow('').max(100),
  bankAccountNumber: Joi.string().trim().allow('').max(50),
  paymentMethod: Joi.string().trim().valid('Mobile money', 'Bank transfer', 'Card', 'Cash'),
}).min(1).options({ abortEarly: false, stripUnknown: true });