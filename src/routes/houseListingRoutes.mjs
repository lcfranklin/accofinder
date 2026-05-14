import express from 'express';
import * as houseController from '../controllers/houseListingController.mjs';
import { checkRole, isAuthenticated } from '../middleware/authMiddleware.mjs';
import { createHouseSchema } from '../validators/createHouseSchema.mjs';
import { updateHouseSchema } from '../validators/updateHouseSchema.mjs';
import { validateRequest } from '../middleware/requestValidationMiddleware.mjs';

const houseListingRoutes = express.Router();

houseListingRoutes.get('/', houseController.getHouses);
houseListingRoutes.post(
  '/',
  isAuthenticated,
  checkRole(['admin', 'landlord']),
  validateRequest(createHouseSchema),
  houseController.createHouse,
);
houseListingRoutes.get('/:id', houseController.getHouseById);
houseListingRoutes.put(
  '/:id',
  isAuthenticated,
  checkRole(['admin', 'landlord']),
  validateRequest(updateHouseSchema),
  houseController.updateHouse,
);
houseListingRoutes.delete(
  '/:id',
  isAuthenticated,
  checkRole(['admin', 'landlord']),
  houseController.deleteHouse,
);

export default houseListingRoutes;
