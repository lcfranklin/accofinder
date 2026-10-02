// Provisional hold timing (see docs: "Provisional Hold + Auto-Expiry Booking
// Model"). Everything is env-overridable so the window can be tuned without a
// redeploy once we have real conversion data.
const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

// The window a client gets to complete payment after tapping "Book Now".
export const HOLD_DURATION_MS = num(process.env.HOLD_DURATION_MS, 20 * 60 * 1000);

// Mobile money settles on the provider's schedule, not the user's, and the app
// only learns the outcome when it next calls GET /payments/verify/:chargeId.
// Once a payment is in flight we extend the hold so a late confirmation still
// lands instead of being rejected against an already-expired window.
export const PAYMENT_IN_FLIGHT_GRACE_MS = num(
  process.env.PAYMENT_IN_FLIGHT_GRACE_MS,
  45 * 60 * 1000,
);

// Absolute ceiling for a single hold, measured from booking creation. The
// in-flight extension can never push a hold past this, so a client cannot keep
// a room off the market indefinitely by repeatedly initiating payments.
export const HOLD_HARD_CAP_MS = num(
  process.env.HOLD_HARD_CAP_MS,
  HOLD_DURATION_MS + PAYMENT_IN_FLIGHT_GRACE_MS,
);

// Booking statuses that hold inventory and are therefore subject to expiry.
export const HOLD_SUBJECT_STATUSES = Object.freeze([
  'PendingPayment',
  'PaymentInFlight',
  'Failed',
]);

// How often the release sweep runs. Kept short so a lapsed hold frees the room
// promptly; the sweep is a single indexed range query, so it is cheap.
export const HOLD_SWEEP_INTERVAL_MS = num(
  process.env.HOLD_SWEEP_INTERVAL_MS,
  60 * 1000,
);

// Set HOLD_SWEEP_ENABLED=false to disable the sweeper (used by tests that drive
// expiry explicitly, and useful when running more than one API instance).
export const HOLD_SWEEP_ENABLED = process.env.HOLD_SWEEP_ENABLED !== 'false';