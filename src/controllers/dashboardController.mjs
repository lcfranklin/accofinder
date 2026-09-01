import { User } from '../models/User.mjs';
import { Property } from '../models/Property.mjs';
import { Booking } from '../models/Booking.mjs';
import { Dispute } from '../models/Dispute.mjs';
import { Payment } from '../models/Payment.mjs';
import { UserRole } from '../models/enums/UserRole.mjs';
import { asyncHandler, sendResponse, withIdList } from '../utils/helpers.mjs';

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
        { $match: { status: { $ne: 'Cancelled' } } },
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
    .populate('bookingId', 'amount')
    .sort({ createdAt: -1 })
    .limit(100);

  let totalCollected = 0;
  let pendingCount = 0;

  const list = payments.map((p) => {
    if (p.status === 'Success') totalCollected += p.amount || 0;
    else if (p.status === 'Initiated') pendingCount += 1;

    return {
      paymentId: String(p._id),
      amount: p.amount || 0,
      status: p.status,
      method: p.method || '',
      date: p.paidAt ? p.paidAt.toISOString().slice(0, 10) : p.createdAt.toISOString().slice(0, 10),
      booking: p.bookingId ? String(p.bookingId._id || p.bookingId) : '',
      kind: 'Payment',
      user: '',
    };
  });

  return { list, totalCollected, pendingCount };
};

const toCommissionsList = async () => {
  const [agents, bookings] = await Promise.all([
    User.find({ role: UserRole.AGENT }).select('firstName surname commissionRate assignedArea'),
    Booking.find({ status: { $ne: 'Cancelled' } }).select('commissionAmount'),
  ]);

  const commissions = agents.map((agent) => {
    const rate = typeof agent.commissionRate === 'number' ? agent.commissionRate : 0;
    const amount = bookings.reduce((sum, b) => sum + (b.commissionAmount || 0), 0);
    return {
      agent: `${agent.firstName || ''} ${agent.surname || ''}`.trim(),
      amount,
      status: amount > 0 ? 'Due' : 'Settled',
      bookings: bookings.length,
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
  const payments = await Payment.find({ status: 'Success', payoutStatus: 'Pending' })
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