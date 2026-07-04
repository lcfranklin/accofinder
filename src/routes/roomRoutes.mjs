import express from 'express';
import * as roomController from '../controllers/roomController.mjs'

const roomRoutes = express.Router();
    roomRoutes.post('/create', roomController.createRoom)

export default roomRoutes;