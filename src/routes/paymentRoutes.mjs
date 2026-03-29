import express from 'express';
import { createCheckoutSession } from '../controllers/paymentController.mjs';

const paymentRoutes = express.Router();

paymentRoutes.post('/create-checkout-session', createCheckoutSession);

export default paymentRoutes;
