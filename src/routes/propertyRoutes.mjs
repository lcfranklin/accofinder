import express from 'express';
import * as propertyController from '../controllers/propertyController.mjs'
const propertyRoutes = express.Router();

    propertyRoutes.post('/create', propertyController.createProperty);
    propertyRoutes.patch('/:id/update', propertyController.updateProperty)
    propertyRoutes.get('/', propertyController.getAllProperties);
    propertyRoutes.get('/:id', propertyController.getPropertyById);

export default propertyRoutes;