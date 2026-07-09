import express from 'express'
import * as bedController from '../controllers/bedController.mjs';

const bedRoutes = express.Router()

    bedRoutes.post('/create', bedController.createBed);
    bedRoutes.get('/', bedController.getAllBeds);
    bedRoutes.get('/:id', bedController.getBedById);
    
export default bedRoutes;