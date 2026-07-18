import express from 'express';
import * as houseController from '../controllers/houseController.mjs';
import { checkRole, isAuthenticated } from '../middleware/authMiddleware.mjs';
import { createHouseSchema } from '../validators/createHouseSchema.mjs';
import { updateHouseSchema } from '../validators/updateHouseSchema.mjs';
import { validateRequest } from '../middleware/requestValidationMiddleware.mjs';

const houseRoutes = express.Router();

houseRoutes.get('/', houseController.getHouses);
houseRoutes.post('/create', houseController.createHouse);
houseRoutes.post(
  '/',
  isAuthenticated,
  checkRole(['admin', 'landlord']),
  validateRequest(createHouseSchema),
  houseController.createHouse,
);
houseRoutes.get('/:id', houseController.getHouseById);
houseRoutes.put(
  '/:id',
  isAuthenticated,
  checkRole(['admin', 'landlord']),
  validateRequest(updateHouseSchema),
  houseController.updateHouse,
);
houseRoutes.delete(
  '/:id',
  isAuthenticated,
  checkRole(['admin', 'landlord']),
  houseController.deleteHouse,
);

export default houseRoutes;
