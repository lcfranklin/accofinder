import express from 'express';
import * as roomController from '../controllers/roomController.mjs';
import { isAuthenticated, checkRole } from '../middleware/authMiddleware.mjs';
import { validateRequest } from '../middleware/requestValidationMiddleware.mjs';
import { createRoomSchema } from '../validators/createRoomSchema.mjs';
import { updateRoomSchema } from '../validators/updateRoomSchema.mjs';
import { queryRoomSchema } from '../validators/queryRoomSchema.mjs';

const roomRoutes = express.Router();

// Query rooms across properties (filtering by price, roomType, availability)
roomRoutes.get(
  '/',
  validateRequest(queryRoomSchema, 'query'),
  roomController.getAllRooms,
);

// Get all rooms for a specific property
roomRoutes.get('/property/:propertyId', roomController.getRoomsByProperty);

// Get a single room by ID
roomRoutes.get('/:id', roomController.getRoomById);

// Create a new room within a property
roomRoutes.post(
  '/',
  isAuthenticated,
  checkRole(['LANDLORD', 'AGENT', 'ADMIN']),
  validateRequest(createRoomSchema),
  roomController.createRoom,
);

// Update room details or pricing
roomRoutes.put(
  '/:id',
  isAuthenticated,
  checkRole(['LANDLORD', 'AGENT', 'ADMIN']),
  validateRequest(updateRoomSchema),
  roomController.updateRoom,
);

// Delete a room listing
roomRoutes.delete(
  '/:id',
  isAuthenticated,
  checkRole(['LANDLORD', 'AGENT', 'ADMIN']),
  roomController.deleteRoom,
);

export default roomRoutes;
