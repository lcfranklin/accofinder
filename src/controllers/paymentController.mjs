import Stripe from 'stripe';
import { asyncHandler, sendResponse } from '../utils/helpers.mjs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');

/**
 * Create a Stripe checkout session for a booking/payment
 * POST /api/payments/create-checkout-session
 */
export const createCheckoutSession = asyncHandler(async (req, res) => {
  const { items, successUrl, cancelUrl } = req.body;

  if (!items || items.length === 0) {
    return sendResponse(res, 400, false, 'No payment items provided');
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return sendResponse(res, 500, false, 'Stripe configuration missing on server');
  }

  const lineItems = items.map((item) => ({
    price_data: {
      currency: item.currency || 'usd',
      product_data: {
        name: item.name,
      },
      unit_amount: Math.round(item.amount * 100), // Stripe expects amounts in cents
    },
    quantity: item.quantity || 1,
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  sendResponse(res, 200, true, 'Checkout session created', {
    sessionId: session.id,
    url: session.url,
  });
});
