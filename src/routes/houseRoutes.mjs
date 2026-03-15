import express from 'express';
import * as houseController from '../controllers/houseController.mjs';

const router = express.Router();

router.get('/', houseController.getHouses);
router.post('/', houseController.createHouse);

export default router;
