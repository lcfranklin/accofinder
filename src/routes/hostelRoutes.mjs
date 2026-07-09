import express from 'express';
import * as hostelController from '../controllers/hostelController.mjs';


const hostelRoutes = express.Router();

    hostelRoutes.post('/create', hostelController.createHostel);
    hostelRoutes.patch('/:id/update', hostelController.updateHostel);
    hostelRoutes.get('/', hostelController.getAllHostels);
    hostelRoutes.get('/:id', hostelController.getHostelById);

export default hostelRoutes;