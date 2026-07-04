import express from 'express'
import * as bedController from '../controllers/bedController.mjs';

const bedRoutes = express.Router()

    bedRoutes.post('/create', bedController.createBed);

export default bedRoutes;