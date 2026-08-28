import express from 'express';
import * as propertyController from '../controllers/propertyController.mjs';
import { isAuthenticated, checkRole } from '../middleware/authMiddleware.mjs';
import { validateRequest } from '../middleware/requestValidationMiddleware.mjs';
import { createPropertySchema } from '../validators/createPropertySchema.mjs';
import { updatePropertySchema } from '../validators/updatePropertySchema.mjs';
import { queryPropertySchema } from '../validators/queryPropertySchema.mjs';

const propertyRoutes = express.Router();

propertyRoutes.get(
  '/',
  validateRequest(queryPropertySchema, 'query'),
  propertyController.getAllProperties,
);

propertyRoutes.get('/:id', propertyController.getPropertyById);

propertyRoutes.post(
  '/',
  isAuthenticated,
  checkRole(['LANDLORD', 'AGENT', 'ADMIN']),
  validateRequest(createPropertySchema),
  propertyController.createProperty,
);

propertyRoutes.put(
  '/:id',
  isAuthenticated,
  checkRole(['LANDLORD', 'AGENT', 'ADMIN']),
  validateRequest(updatePropertySchema),
  propertyController.updateProperty,
);

propertyRoutes.delete(
  '/:id',
  isAuthenticated,
  checkRole(['LANDLORD', 'AGENT', 'ADMIN']),
  propertyController.deleteProperty,
);

export default propertyRoutes;
