import express from 'express';
import * as roomController from '../controllers/roomController.mjs'

const roomRoutes = express.Router();

    roomRoutes.post('/create', roomController.createRoom);
    roomRoutes.get('/', roomController.getAllRooms);
    roomRoutes.get('/:id', roomController.getRoomById);

export default roomRoutes;