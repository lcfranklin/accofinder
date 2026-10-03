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

// Delete is ADMIN-only, unlike create/update above.
//
// Reason: this is not a plain record delete. The controller also removes every
// room on the property, deletes the media records AND their S3 objects, and
// leaves any existing bookings behind as orphans (their roomId now dangles).
// That is not a decision an agent should be able to make unilaterally - and
// the route used to be guarded by role only, with no ownership check in the
// controller, so any authenticated agent could delete any property in the
// system by id.
propertyRoutes.delete(
  '/:id',
  isAuthenticated,
  checkRole(['ADMIN']),
  propertyController.deleteProperty,
);

export default propertyRoutes;
