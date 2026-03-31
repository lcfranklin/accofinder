// import express from 'express';
// import { createCheckoutSession } from '../controllers/paymentController.mjs';

// const paymentRoutes = express.Router();

// paymentRoutes.post('/create-checkout-session', createCheckoutSession);

// export default paymentRoutes;
import express from 'express';
import {
  getPaymentsByUser,
  initPayment,
  webhookHandler,
  verify,
  cancelPayment
} from '../controllers/paymentController.mjs';

import { isAuthenticated } from '../middleware/authMiddleware.mjs';
import { checkRole } from '../middleware/roleMiddleware.mjs';

const router = express.Router();

// Create a checkout session (returns checkout_url)
router.post("/init",isAuthenticateJWT,checkRole(["client"]),  initPayment);

// for verifying the paymnet.
router.get("/verify", verify);

// for verifying the paymnet.
router.post("/cancel",cancelPayment );

//Webhook (asynchronous). IMPORTANT: raw body ONLY for this route.(for receiving notificaton)
router.post( "/webhook", express.raw({ type: "application/json" }),webhookHandler)


// Get user (cleint) payments
router.get('/user/:userId', authenticateJWT, checkRole(['client']), getPaymentsByUser);


export default router;