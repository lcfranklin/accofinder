import express from 'express';
import * as houseController from '../controllers/houseController.mjs';

const houseRoutes = express.Router();

houseRoutes.get('/', houseController.getHouses);
houseRoutes.post('/create', houseController.createHouse);

export default houseRoutes;
