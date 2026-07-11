import express from 'express'
import * as bedController from '../controllers/bedController.mjs';

const bedRoutes = express.Router()

    bedRoutes.post('/create', bedController.createBed);
    bedRoutes.patch('/:id/update', bedController.updateBed);
    bedRoutes.get('/', bedController.getAllBeds);
    bedRoutes.get('/:id', bedController.getBedById);
    bedRoutes.delete('/:id/delete', bedController.deleteBed);
    
export default bedRoutes;