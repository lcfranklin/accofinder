import express from 'express';
import * as hostelController from '../controllers/hostelController.mjs';


const hostelRoutes = express.Router();

    hostelRoutes.post('/create', hostelController.createHostel);
    hostelRoutes.get('/', hostelController.getAllHostels);

export default hostelRoutes;