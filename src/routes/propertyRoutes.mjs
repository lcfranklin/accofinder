import express from 'express';
import * as propertyController from '../controllers/propertyController.mjs'
const propertyRoutes = express.Router();

    propertyRoutes.post('/create', propertyController.createProperty)
    propertyRoutes.get('/', propertyController.getAllProperties)
    
export default propertyRoutes;