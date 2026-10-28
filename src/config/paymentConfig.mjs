// Payment reconciliation timing (provider-aware). All env-overridable.
const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

// Start verifying with provider after this window (let user finish USSD/approval)
export const PAYMENT_VERIFY_DELAY_MS = num(
  process.env.PAYMENT_VERIFY_DELAY_MS,
  30 * 60 * 1000,
); // 30 min

// Re-check interval while payment remains Initiated/Pending with provider
export const PAYMENT_RECONCILE_INTERVAL_MS = num(
  process.env.PAYMENT_RECONCILE_INTERVAL_MS,
  5 * 60 * 1000,
); // 5 min

// After this time still pending with provider -> flag for review (do not auto-fail)
export const PAYMENT_REVIEW_AFTER_MS = num(
  process.env.PAYMENT_REVIEW_AFTER_MS,
  24 * 60 * 60 * 1000,
); // 24 hours

// After this time and provider says non-existent/expired/failed or cannot confirm -> allow auto-fail
export const PAYMENT_ABANDON_AFTER_MS = num(
  process.env.PAYMENT_ABANDON_AFTER_MS,
  72 * 60 * 60 * 1000,
); // 72 hours

// Max reconcile attempts to avoid hammering provider
export const PAYMENT_MAX_RECONCILE_ATTEMPTS = num(
  process.env.PAYMENT_MAX_RECONCILE_ATTEMPTS,
  20,
);

export const PAYMENT_RECONCILE_ENABLED =
  process.env.PAYMENT_RECONCILE_ENABLED !== 'false';
