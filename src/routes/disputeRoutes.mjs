import express from 'express';
import * as disputeController from '../controllers/disputeController.mjs';
import {isAuthenticated, checkRole} from '../middleware/authMiddleware.mjs';

const disputeRoutes = express.Router();

//landlord and Ternats can see their own disputes but Admins can see ALL
disputeRoutes.get('/', isAuthenticated, disputeController.getDisputes);

//Only authenticated users can create disputes
disputeRoutes.post('/', disputeController.createDispute);

//only Admins or Lamdlords can resolve dispute
disputeRoutes.patch('/:id/resolve', isAuthenticated, checkRole(['Admin', 'Landlord']), disputeController.resolveDispute);


export default disputeRoutes;
