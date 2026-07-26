import Joi from 'joi';
import { objectId, rentableUnitBase } from './rentableUnitSchema.mjs';

export const createRoomSchema = Joi.object({
  ...rentableUnitBase,

  roomNumber: Joi.string().trim().optional(),
  description: Joi.string().trim().optional(),

  capacity: Joi.number().valid(1, 2, 3).optional().messages({
    'any.only': 'Capacity must be 1, 2, or 3',
  }),

  property: objectId.optional(),
  hostel: objectId.optional(),
  house: objectId.optional(),

  floorNumber: Joi.number().integer().min(0).optional(),
  squareFootage: Joi.number().min(0).optional(),

  hasWindow: Joi.boolean().optional(),
  hasBalcony: Joi.boolean().optional(),

  amenities: Joi.array()
    .items(
      Joi.string().valid(
        'AC',
        'FAN',
        'HEATER',
        'FURNISHED',
        'SEMI_FURNISHED',
        'UNFURNISHED',
        'ATTACHED_BATHROOM',
      ),
    )
    .optional(),
})
  .options({ abortEarly: false })
  .unknown(false)

  .custom((value, helpers) => {
    const parents = ['property', 'hostel', 'house'].filter(
      (key) => value[key] !== undefined,
    );
    if (parents.length !== 1) {
      return helpers.error('room.singleParent');
    }
    return value;
  })
  .messages({
    'room.singleParent':
      'A room must belong to exactly one of property, hostel, or house',
  });
