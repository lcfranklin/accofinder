import express from 'express';
import * as roomController from '../controllers/roomController.mjs'

const roomRoutes = express.Router();

    roomRoutes.post('/create', roomController.createRoom);
    roomRoutes.patch('/:id/update', roomController.updateRoom);
    roomRoutes.get('/', roomController.getAllRooms);
    roomRoutes.get('/:id', roomController.getRoomById);
    roomRoutes.delete('/:id/delete', roomController.deleteRoom);

export default roomRoutes;