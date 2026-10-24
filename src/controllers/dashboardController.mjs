import { User } from '../models/User.mjs';
import { Property } from '../models/Property.mjs';
import { Booking } from '../models/Booking.mjs';
import { Room } from '../models/Room.mjs';
import { Dispute } from '../models/Dispute.mjs';
import { Payment } from '../models/Payment.mjs';
import { UserRole } from '../models/enums/UserRole.mjs';
import { BookingStatus } from '../models/enums/BookingStatus.mjs';
import { asyncHandler, sendResponse, withIdList } from '../utils/helpers.mjs';

// A booking only represents realised revenue once its payment has been
// verified. Under the provisional-hold model a booking starts as
// PendingPayment / PaymentInFlight and can end as Expired, Failed, Cancelled or
// Refunded without ever being paid, so none of those may inflate booking value
// or platform commission. Legacy 'Paid' rows (pre-hold model) are counted too.
const CONFIRMED_BOOKING_STATUSES = [
  BookingStatus.CONFIRMED,
  BookingStatus.PAID,
];

//  Admin dashboard stats.
//
//  Every value comes from the database so the UI never shows hard-coded zeros;
//  a metric with no data yet simply returns 0 from the aggregation below. All
//  counts/amounts are aggregated server-side and returned in one payload.
export const getDashboardStats = asyncHandler(async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalAgents,
      totalProperties,
      pendingVerifications,
      totalBookings,
      bookingValueAgg,
      openDisputes,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: UserRole.AGENT }),
      Property.countDocuments({}),
      Property.countDocuments({ verificationStatus: 'PENDING' }),
      Booking.countDocuments({}),
      Booking.aggregate([
        { $match: { status: { $in: CONFIRMED_BOOKING_STATUSES } } },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            commission: { $sum: '$commissionAmount' },
          },
        },
      ]),
      Dispute.countDocuments({ status: 'Open' }),
    ]);

    const totalBookingValue = bookingValueAgg[0]?.total || 0;
    const platformCommission = bookingValueAgg[0]?.commission || 0;

    const data = {
      totalUsers,
      totalAgents,
      totalProperties,
      pendingVerifications,
      totalBookings,
      totalBookingValue,
      platformCommission,
      openDisputes,
    };

    return sendResponse(res, 200, true, 'Dashboard stats retrieved', data);
  } catch (error) {
    next(error);
  }
});

//  Admin payments & commission oversight.
//
//  Returns the summary cards plus the underlying lists for the three oversight
//  tabs (payments / commissions / payouts). Values are derived from real
//  Payment and Booking rows; empty collections simply yield empty lists and
//  zero summaries.
const toPaymentsList = async () => {
  const payments = await Payment.find()
    .populate({
      path: 'bookingId',
      select: 'amount clientId clientName clientFirstName clientSurname clientEmail clientPhone',
      populate: {
        path: 'clientId',
        select: 'firstName surname email phone',
      },
    })
    .sort({ createdAt: -1 })
    .limit(100);

  let totalCollected = 0;
  let pendingCount = 0;

  const list = payments.map((p) => {
    if (p.status === 'Success') totalCollected += p.amount || 0;
    else if (p.status === 'Initiated') pendingCount += 1;

    const booking = p.bookingId || {};
    const client = booking.clientId || {};
    const userName =
      booking.clientName ||
      [client.firstName || booking.clientFirstName, client.surname || booking.clientSurname]
        .filter(Boolean)
        .join(' ') ||
      booking.clientEmail ||
      client.email ||
      booking.clientPhone ||
      client.phone ||
      '';

    return {
      paymentId: String(p._id),
      amount: p.amount || 0,
      status: p.status,
      method: p.method || '',
      date: p.paidAt
        ? p.paidAt.toISOString().slice(0, 10)
        : p.createdAt.toISOString().slice(0, 10),
      booking: booking._id ? String(booking._id) : p.bookingId ? String(p.bookingId) : '',
      bookingId: booking._id ? String(booking._id) : p.bookingId ? String(p.bookingId) : '',
      kind: 'Payment',
      user: userName,
      transactionRef: p.transactionRef || '',
    };
  });

  return { list, totalCollected, pendingCount };
};

const toCommissionsList = async () => {
  const agents = await User.find({ role: UserRole.AGENT }).select(
    'firstName surname commissionRate assignedArea',
  );

  // A booking belongs to an agent only through its room's property owner
  // (booking -> bookableItemId via Room -> property -> owner). Handle polymorphic
  // bookings (Room/Property).
  const bookings = await Booking.find({
    status: { $in: CONFIRMED_BOOKING_STATUSES },
  })
    .select('commissionAmount bookableItemType bookableItemId')
    .populate({
      path: 'bookableItemId',
      select: 'propertyId',
      populate: { path: 'propertyId', select: 'owner' },
    });

  // Aggregate per owner once, then read each agent's bucket by id.
  const byOwner = new Map();
  for (const booking of bookings) {
    let owner = null;
    const bookable = booking.bookableItemId;
    if (bookable) {
      if (bookable.propertyId && bookable.propertyId.owner) {
        owner = bookable.propertyId.owner;
      } else if (bookable.owner) {
        owner = bookable.owner;
      }
    }
    if (!owner) continue;
    const key = String(owner);
    const agg = byOwner.get(key) || { count: 0, amount: 0 };
    agg.count += 1;
    agg.amount += booking.commissionAmount || 0;
    byOwner.set(key, agg);
  }

  const commissions = agents.map((agent) => {
    const rate =
      typeof agent.commissionRate === 'number' ? agent.commissionRate : 0;
    const agg = byOwner.get(String(agent._id)) || { count: 0, amount: 0 };
    return {
      agent: `${agent.firstName || ''} ${agent.surname || ''}`.trim(),
      amount: agg.amount,
      status: agg.amount > 0 ? 'Due' : 'Settled',
      bookings: agg.count,
      area: agent.assignedArea || '',
      rate,
    };
  });

  const commissionsDue = commissions.reduce(
    (sum, c) => (c.status === 'Due' ? sum + c.amount : sum),
    0,
  );

  return { list: commissions, commissionsDue };
};

const toPayoutsList = async () => {
  const payments = await Payment.find({
    status: 'Success',
    payoutStatus: 'Pending',
  })
    .populate('bookingId', 'amount')
    .sort({ paidAt: -1 })
    .limit(100);

  const list = payments.map((p) => ({
    landlord: `Landlord ${String(p.bookingId?._id || '').slice(-4)}`,
    amount: p.amount || 0,
    status: p.payoutStatus || 'Pending',
    property: p.bookingId ? String(p.bookingId._id || p.bookingId) : '',
    period: p.paidAt ? p.paidAt.toISOString().slice(0, 7) : '',
  }));

  return { list, payoutsPending: list.length };
};

export const getPaymentsOverview = asyncHandler(async (req, res, next) => {
  try {
    const [payments, commissions, payouts] = await Promise.all([
      toPaymentsList(),
      toCommissionsList(),
      toPayoutsList(),
    ]);

    const data = {
      totalCollected: payments.totalCollected,
      pendingCount: payments.pendingCount,
      commissionsDue: commissions.commissionsDue,
      payoutsPending: payouts.payoutsPending,
      payments: payments.list,
      commissions: commissions.list,
      payouts: payouts.list,
    };

    return sendResponse(res, 200, true, 'Payments overview retrieved', data);
  } catch (error) {
    next(error);
  }
});
