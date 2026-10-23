const appointmentService = require('../../services/appointmentService');
const slotService = require('../../services/slotService');
const Patient = require('../../models/Patient');
const Payment = require('../../models/Payment');
const Appointment = require('../../models/Appointment');
const Order = require('../../models/Order');

exports.getDashboard = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const aptDateQuery = {};
    const payDateQuery = {};

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      aptDateQuery.$gte = start;
      payDateQuery.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      aptDateQuery.$lte = end;
      payDateQuery.$lte = end;
    }

    const hasDateFilter = Object.keys(aptDateQuery).length > 0;
    const aptFilter = hasDateFilter
      ? { $or: [{ appointmentDate: aptDateQuery }, { createdAt: aptDateQuery }] }
      : {};
    const payFilter = {
      status: { $in: ['captured', 'completed', 'paid'] },
      ...(hasDateFilter ? { created_at: payDateQuery } : {}),
    };
    const orderFilter = hasDateFilter ? { created_at: payDateQuery } : {};

    const [
      totalAppointments,
      totalSlots,
      activePatients,
      pendingApprovals,
      revenueResult,
      totalOrders,
      onlineCount,
      offlineCount,
    ] = await Promise.all([
      appointmentService.countAppointments(aptFilter),
      slotService.countSlots(),
      Patient.countDocuments({ active: true }),
      Appointment.countDocuments({ status: 'pending', ...aptFilter }),
      Payment.aggregate([
        { $match: payFilter },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Order.countDocuments(orderFilter),
      Appointment.countDocuments({
        ...aptFilter,
        $or: [{ consultation_type: 'online' }, { bookingType: { $regex: /^online$/i } }],
      }),
      Appointment.countDocuments({
        ...aptFilter,
        $or: [{ consultation_type: 'offline' }, { bookingType: { $regex: /^offline$/i } }],
      }),
    ]);

    // Compute monthly trends dynamically for recent 6 months
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: `${monthNames[d.getMonth()]}`,
      });
    }

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [monthlyRevenueAgg, monthlyAptAgg] = await Promise.all([
      Payment.aggregate([
        {
          $match: {
            status: { $in: ['captured', 'completed', 'paid'] },
            created_at: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$created_at' },
              month: { $month: '$created_at' },
            },
            revenue: { $sum: '$amount' },
          },
        },
      ]),
      Appointment.aggregate([
        {
          $match: {
            createdAt: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            appointments: { $sum: 1 },
          },
        },
      ]),
    ]);

    const revMap = new Map();
    monthlyRevenueAgg.forEach((r) => {
      revMap.set(`${r._id.year}-${r._id.month}`, r.revenue);
    });

    const aptMap = new Map();
    monthlyAptAgg.forEach((a) => {
      aptMap.set(`${a._id.year}-${a._id.month}`, a.appointments);
    });

    const monthlyTrends = months.map((m) => {
      const key = `${m.year}-${m.month}`;
      return {
        month: m.label,
        revenue: revMap.get(key) || 0,
        appointments: aptMap.get(key) || 0,
      };
    });

    res.json({
      success: true,
      data: {
        totalAppointments,
        totalSlots,
        activePatients,
        pendingApprovals,
        totalRevenue: revenueResult[0]?.total || 0,
        totalOrders,
        onlineCount,
        offlineCount,
        monthlyTrends,
        serverDate: now.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

