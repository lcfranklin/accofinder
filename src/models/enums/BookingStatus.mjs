// Booking lifecycle under the provisional hold model:
//
//   PENDING_PAYMENT ──payment initiated──> PAYMENT_IN_FLIGHT ──verified ok──> CONFIRMED
//          │                                    │
//          ├──user cancels──────────────────────┤
//          ├──payment fails (hold stands)──────┤
//          └──window lapses────────────────────┴──> EXPIRED
//
// Only CONFIRMED permanently takes the room off the market. CANCELLED, EXPIRED
// and FAILED all release or eventually release the hold.
export const BookingStatus = Object.freeze({
  // Hold is active; the client is expected to pay within the window.
  PENDING_PAYMENT: 'PendingPayment',

  // A payment has been sent to the provider but not yet verified. Exempt from
  // the normal timer (extended by the in-flight grace) so a late confirmation
  // still lands, but still subject to the hard cap.
  PAYMENT_IN_FLIGHT: 'PaymentInFlight',

  // Payment verified with the provider. The room is permanently booked.
  CONFIRMED: 'Confirmed',

  // Hold timed out with no successful payment. Room released.
  EXPIRED: 'Expired',

  // The user backed out. Room released.
  CANCELLED: 'Cancelled',

  // A payment attempt failed. The hold stands so the user can retry until the
  // window ends; it is NOT released here.
  FAILED: 'Failed',

  // --- Legacy values, kept so historical rows still render. The hold model no
  // longer produces either of these. ---
  PENDING: 'Pending',
  PAID: 'Paid',
});
