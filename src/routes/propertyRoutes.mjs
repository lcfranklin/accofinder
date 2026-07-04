import express from 'express';
import * as propertyController from '../controllers/propertyCOntroller.mjs'
const propertyRoutes = express.Router();

    propertyRoutes.post('/create', propertyController.createProperty)

export default propertyRoutes;