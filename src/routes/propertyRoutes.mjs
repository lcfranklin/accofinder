import express from 'express';
import * as propertyController from '../controllers/propertyController.mjs';
import { isAuthenticated, checkRole } from '../middleware/authMiddleware.mjs';
import { validateRequest } from '../middleware/requestValidationMiddleware.mjs';
import { createPropertySchema } from '../validators/createPropertySchema.mjs';
import { updatePropertySchema } from '../validators/updatePropertySchema.mjs';
import { queryPropertySchema } from '../validators/queryPropertySchema.mjs';

const propertyRoutes = express.Router();

// List all properties with pagination, filtering & search
propertyRoutes.get(
  '/',
  validateRequest(queryPropertySchema, 'query'),
  propertyController.getAllProperties,
);

// Get a single property by ID (including populated rooms)
propertyRoutes.get('/:id', propertyController.getPropertyById);

// Search properties near a location
propertyRoutes.get('/search/nearby', propertyController.searchProperties);

// Create a new property listing
propertyRoutes.post(
  '/',
  isAuthenticated,
  checkRole(['LANDLORD', 'AGENT', 'ADMIN']),
  validateRequest(createPropertySchema),
  propertyController.createProperty,
);

// Update property details
propertyRoutes.put(
  '/:id',
  isAuthenticated,
  checkRole(['LANDLORD', 'AGENT', 'ADMIN']),
  validateRequest(updatePropertySchema),
  propertyController.updateProperty,
);

// Delete a property listing
propertyRoutes.delete(
  '/:id',
  isAuthenticated,
  checkRole(['LANDLORD', 'AGENT', 'ADMIN']),
  propertyController.deleteProperty,
);

export default propertyRoutes;
