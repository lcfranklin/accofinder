import express from 'express';
import * as disputeController from '../controllers/disputeController.mjs';

const disputeRoutes = express.Router();

disputeRoutes.get('/', disputeController.getDisputes);
disputeRoutes.post('/', disputeController.createDispute);

export default disputeRoutes;
