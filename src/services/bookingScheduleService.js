const BookingSchedule = require('../models/BookingSchedule');
const Slot = require('../models/Slot');
const Appointment = require('../models/Appointment');

const MIN_DURATION = 15;
const MAX_DURATION = 35;

/**
 * Validates slot duration: 15 <= duration <= 35
 */
const validateSlotDuration = (duration) => {
  const parsed = Number(duration);
  if (!Number.isInteger(parsed) || parsed < MIN_DURATION || parsed > MAX_DURATION) {
    const error = new Error(`Slot duration must be between ${MIN_DURATION} and ${MAX_DURATION} minutes.`);
    error.statusCode = 400;
    throw error;
  }
  return parsed;
};

/**
 * Parses "HH:mm" into minutes since midnight
 */
const timeToMinutes = (timeStr, fieldName = 'Time') => {
  if (!timeStr || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr)) {
    const error = new Error(`${fieldName} must be in 24-hour HH:mm format (e.g. 09:30, 17:00).`);
    error.statusCode = 400;
    throw error;
  }
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Validates that time ranges do not overlap and each range has startTime < endTime
 */
const validateTimeRanges = (ranges) => {
  if (!Array.isArray(ranges)) return [];

  const validated = [];
  const intervals = [];

  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    const startMins = timeToMinutes(r.startTime, `Range ${i + 1} start time`);
    const endMins = timeToMinutes(r.endTime, `Range ${i + 1} end time`);

    if (startMins >= endMins) {
      const error = new Error(
        `Start time (${r.startTime}) must be strictly earlier than end time (${r.endTime}).`
      );
      error.statusCode = 400;
      throw error;
    }

    intervals.push({ startMins, endMins, startTime: r.startTime, endTime: r.endTime });
  }

  // Sort intervals by start time
  intervals.sort((a, b) => a.startMins - b.startMins);

  // Check for overlap
  for (let i = 0; i < intervals.length - 1; i++) {
    if (intervals[i].endMins > intervals[i + 1].startMins) {
      const error = new Error(
        `Time ranges cannot overlap: ${intervals[i].startTime}–${intervals[i].endTime} overlaps with ${intervals[i + 1].startTime}–${intervals[i + 1].endTime}.`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  return intervals.map((intv) => ({ startTime: intv.startTime, endTime: intv.endTime }));
};

/**
 * Gets or creates default schedule for a booking type ('online' or 'offline')
 */
const getOrCreateSchedule = async (bookingType) => {
  const type = String(bookingType || '').toLowerCase();
  if (type !== 'online' && type !== 'offline') {
    const error = new Error("Booking type must be either 'online' or 'offline'.");
    error.statusCode = 400;
    throw error;
  }

  let schedule = await BookingSchedule.findOne({ bookingType: type });
  if (!schedule) {
    schedule = await BookingSchedule.create({
      bookingType: type,
      slotDuration: 30,
      defaultSchedule: {
        enabled: true,
        timeRanges: [{ startTime: '10:00', endTime: '18:00' }],
      },
      weeklySchedule: [
        { dayOfWeek: 1, enabled: true, timeRanges: [{ startTime: '10:00', endTime: '18:00' }] }, // Mon
        { dayOfWeek: 2, enabled: true, timeRanges: [{ startTime: '10:00', endTime: '18:00' }] }, // Tue
        { dayOfWeek: 3, enabled: true, timeRanges: [{ startTime: '10:00', endTime: '18:00' }] }, // Wed
        { dayOfWeek: 4, enabled: true, timeRanges: [{ startTime: '10:00', endTime: '18:00' }] }, // Thu
        { dayOfWeek: 5, enabled: true, timeRanges: [{ startTime: '10:00', endTime: '18:00' }] }, // Fri
        { dayOfWeek: 6, enabled: true, timeRanges: [{ startTime: '10:00', endTime: '18:00' }] }, // Sat
        { dayOfWeek: 0, enabled: false, timeRanges: [] }, // Sun
      ],
      dateOverrides: [],
    });
  }
  return schedule;
};

/**
 * Updates an entire schedule (slotDuration, defaultSchedule, weeklySchedule, etc.)
 */
const updateSchedule = async (bookingType, updateData, userId) => {
  const schedule = await getOrCreateSchedule(bookingType);

  if (updateData.slotDuration !== undefined) {
    schedule.slotDuration = validateSlotDuration(updateData.slotDuration);
  }

  if (updateData.defaultSchedule) {
    const def = updateData.defaultSchedule;
    schedule.defaultSchedule.enabled = def.enabled !== false;
    if (def.timeRanges) {
      schedule.defaultSchedule.timeRanges = validateTimeRanges(def.timeRanges);
    }
  }

  if (Array.isArray(updateData.weeklySchedule)) {
    const validatedWeekly = [];
    for (const day of updateData.weeklySchedule) {
      const dayNum = Number(day.dayOfWeek);
      if (!Number.isInteger(dayNum) || dayNum < 0 || dayNum > 6) {
        const error = new Error('dayOfWeek must be between 0 (Sunday) and 6 (Saturday).');
        error.statusCode = 400;
        throw error;
      }
      validatedWeekly.push({
        dayOfWeek: dayNum,
        enabled: day.enabled !== false,
        timeRanges: day.enabled ? validateTimeRanges(day.timeRanges || []) : [],
      });
    }
    schedule.weeklySchedule = validatedWeekly;
  }

  if (Array.isArray(updateData.dateOverrides)) {
    const validatedOverrides = [];
    for (const ov of updateData.dateOverrides) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ov.date)) {
        const error = new Error(`Invalid override date: ${ov.date}. Must be YYYY-MM-DD.`);
        error.statusCode = 400;
        throw error;
      }
      validatedOverrides.push({
        date: ov.date,
        isClosed: Boolean(ov.isClosed),
        timeRanges: ov.isClosed ? [] : validateTimeRanges(ov.timeRanges || []),
        note: ov.note ? String(ov.note).trim() : '',
      });
    }
    schedule.dateOverrides = validatedOverrides;
  }

  if (userId) {
    schedule.updatedBy = userId;
  }
  schedule.updatedAt = new Date();

  await schedule.save();
  return schedule;
};

/**
 * Adds or updates a single date-specific override
 */
const setDateOverride = async (bookingType, { date, isClosed, timeRanges, note }, userId) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const error = new Error('date must be in YYYY-MM-DD format');
    error.statusCode = 400;
    throw error;
  }

  const schedule = await getOrCreateSchedule(bookingType);
  const validatedRanges = isClosed ? [] : validateTimeRanges(timeRanges || []);

  const existingIdx = schedule.dateOverrides.findIndex((ov) => ov.date === date);
  if (existingIdx >= 0) {
    schedule.dateOverrides[existingIdx].isClosed = Boolean(isClosed);
    schedule.dateOverrides[existingIdx].timeRanges = validatedRanges;
    schedule.dateOverrides[existingIdx].note = note ? String(note).trim() : '';
  } else {
    schedule.dateOverrides.push({
      date,
      isClosed: Boolean(isClosed),
      timeRanges: validatedRanges,
      note: note ? String(note).trim() : '',
    });
  }

  if (userId) schedule.updatedBy = userId;
  schedule.updatedAt = new Date();

  await schedule.save();
  return schedule;
};

/**
 * Removes a date-specific override
 */
const removeDateOverride = async (bookingType, date, userId) => {
  const schedule = await getOrCreateSchedule(bookingType);
  schedule.dateOverrides = schedule.dateOverrides.filter((ov) => ov.date !== date);
  if (userId) schedule.updatedBy = userId;
  schedule.updatedAt = new Date();
  await schedule.save();
  return schedule;
};

/**
 * Resolves the effective schedule for a specific date (YYYY-MM-DD)
 * Priority:
 *   Level 1: Date-specific override
 *   Level 2: Weekly schedule (day of week)
 *   Level 3: Default/basic fallback
 */
const resolveEffectiveSchedule = async (bookingType, dateString) => {
  const schedule = await getOrCreateSchedule(bookingType);
  const parsedDate = new Date(`${dateString}T12:00:00+05:30`);
  if (Number.isNaN(parsedDate.getTime())) {
    const error = new Error('Invalid date string. Expected YYYY-MM-DD.');
    error.statusCode = 400;
    throw error;
  }

  const dayOfWeek = parsedDate.getDay(); // 0 = Sun, 1 = Mon...
  const slotDuration = schedule.slotDuration || 30;

  // Level 1: Specific Date Override
  const dateOverride = schedule.dateOverrides.find((ov) => ov.date === dateString);
  if (dateOverride) {
    if (dateOverride.isClosed) {
      return {
        level: 'DATE_SPECIFIC',
        date: dateString,
        isClosed: true,
        slotDuration,
        timeRanges: [],
        note: dateOverride.note || 'Closed for this date',
      };
    }
    return {
      level: 'DATE_SPECIFIC',
      date: dateString,
      isClosed: false,
      slotDuration,
      timeRanges: dateOverride.timeRanges,
      note: dateOverride.note || '',
    };
  }

  // Level 2: Weekly Schedule
  const weeklyDay = schedule.weeklySchedule.find((w) => w.dayOfWeek === dayOfWeek);
  if (weeklyDay) {
    if (!weeklyDay.enabled) {
      return {
        level: 'WEEKLY',
        date: dateString,
        isClosed: true,
        slotDuration,
        timeRanges: [],
        note: 'Day is closed in weekly schedule',
      };
    }
    if (weeklyDay.timeRanges && weeklyDay.timeRanges.length > 0) {
      return {
        level: 'WEEKLY',
        date: dateString,
        isClosed: false,
        slotDuration,
        timeRanges: weeklyDay.timeRanges,
        note: '',
      };
    }
  }

  // Level 3: Default/Basic Schedule Fallback
  if (schedule.defaultSchedule && schedule.defaultSchedule.enabled) {
    return {
      level: 'DEFAULT',
      date: dateString,
      isClosed: false,
      slotDuration,
      timeRanges: schedule.defaultSchedule.timeRanges || [],
      note: 'Using default clinic schedule',
    };
  }

  return {
    level: 'DEFAULT',
    date: dateString,
    isClosed: true,
    slotDuration,
    timeRanges: [],
    note: 'No active schedule available',
  };
};

/**
 * Generates slots for a specific date while strictly preserving existing slots.
 * Any slot already created by admin or attached to an active appointment
 * will NOT be removed or modified.
 */
const generateSlotsForDate = async (bookingType, dateString) => {
  const type = String(bookingType || '').toLowerCase();
  const effective = await resolveEffectiveSchedule(type, dateString);

  const dayStart = new Date(`${dateString}T00:00:00+05:30`);
  const dayEnd = new Date(`${dateString}T23:59:59.999+05:30`);

  // 1. Fetch all existing slots on this date for this bookingType (or both or untyped)
  const existingSlots = await Slot.find({
    startTime: { $gte: dayStart, $lte: dayEnd },
    $or: [
      { bookingType: { $in: [type, 'both'] } },
      { bookingType: { $exists: false } },
      { bookingType: null },
    ],
  });

  // If the day is marked closed by schedule, do not generate new slots, return existing
  if (effective.isClosed || !effective.timeRanges || effective.timeRanges.length === 0) {
    return Slot.find({
      startTime: { $gte: dayStart, $lte: dayEnd },
      $or: [
        { bookingType: { $in: [type, 'both'] } },
        { bookingType: { $exists: false } },
        { bookingType: null },
      ],
    }).sort({ startTime: 1 });
  }

  const durationMins = effective.slotDuration;
  const desiredSlots = [];

  // Generate slots for each time range in IST without overlap
  for (const range of effective.timeRanges) {
    const rangeStart = new Date(`${dateString}T${range.startTime}:00+05:30`);
    const rangeEnd = new Date(`${dateString}T${range.endTime}:00+05:30`);

    let current = new Date(rangeStart);
    while (current.getTime() + durationMins * 60000 <= rangeEnd.getTime()) {
      const slotEnd = new Date(current.getTime() + durationMins * 60000);
      desiredSlots.push({
        startTime: new Date(current),
        endTime: slotEnd,
        bookingType: type,
        durationMinutes: durationMins,
        available: true,
      });
      current = slotEnd;
    }
  }

  // Insert desired slots if they don't already exist
  const existingSlotKeyMap = new Map();
  existingSlots.forEach((es) => {
    existingSlotKeyMap.set(`${new Date(es.startTime).getTime()}_${new Date(es.endTime).getTime()}`, es);
  });

  const toInsert = [];
  for (const ds of desiredSlots) {
    const key = `${ds.startTime.getTime()}_${ds.endTime.getTime()}`;
    if (!existingSlotKeyMap.has(key)) {
      toInsert.push(ds);
    }
  }

  if (toInsert.length > 0) {
    await Slot.insertMany(toInsert);
  }

  // NOTE: We do NOT delete existing unbooked slots that the admin has added!
  return Slot.find({
    startTime: { $gte: dayStart, $lte: dayEnd },
    $or: [
      { bookingType: { $in: [type, 'both'] } },
      { bookingType: { $exists: false } },
      { bookingType: null },
    ],
  }).sort({ startTime: 1 });
};

/**
 * Gets available slots for booking with dynamic schedule generation up to advanceBookingDays
 */
const getAvailableSlots = async ({ type, date, daysAhead = 30 } = {}) => {
  const bookingType = type ? String(type).toLowerCase() : 'online';
  const schedule = await getOrCreateSchedule(bookingType);

  // If a specific date is requested
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    await generateSlotsForDate(bookingType, date);
    const dayStart = new Date(`${date}T00:00:00+05:30`);
    const dayEnd = new Date(`${date}T23:59:59.999+05:30`);

    return Slot.find({
      startTime: { $gte: dayStart, $lte: dayEnd },
      $or: [
        { bookingType: { $in: [bookingType, 'both'] } },
        { bookingType: { $exists: false } },
        { bookingType: null },
      ],
      available: true,
    }).sort({ startTime: 1 });
  }

  // Current date in India (IST)
  const now = new Date();
  const istFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' });
  const todayStr = istFormatter.format(now);

  const maxDays = Math.min(Math.max(Number(daysAhead) || 30, 1), 60);
  const datesToEnsure = new Set();

  // Add the next maxDays dates starting from TODAY
  const baseTime = new Date(`${todayStr}T12:00:00+05:30`).getTime();
  for (let i = 0; i < maxDays; i++) {
    const d = new Date(baseTime + i * 24 * 60 * 60 * 1000);
    datesToEnsure.add(istFormatter.format(d));
  }

  // Also include any specific date overrides created by admin in schedule
  if (Array.isArray(schedule.dateOverrides)) {
    schedule.dateOverrides.forEach((ov) => {
      if (ov.date && ov.date >= todayStr) {
        datesToEnsure.add(ov.date);
      }
    });
  }

  // Also include any dates where admin created slots directly in the Slot collection
  const existingAdminSlots = await Slot.find({
    startTime: { $gte: new Date(`${todayStr}T00:00:00+05:30`) },
    available: true,
    $or: [
      { bookingType: { $in: [bookingType, 'both'] } },
      { bookingType: { $exists: false } },
      { bookingType: null },
    ],
  }).select('startTime').lean();

  existingAdminSlots.forEach((s) => {
    if (s.startTime) {
      datesToEnsure.add(istFormatter.format(new Date(s.startTime)));
    }
  });

  // Ensure schedule slots are generated for all these dates
  const promises = [];
  for (const dateStr of datesToEnsure) {
    promises.push(generateSlotsForDate(bookingType, dateStr));
  }
  await Promise.all(promises);

  // Return all upcoming available slots (from current time onwards)
  return Slot.find({
    startTime: { $gte: now },
    available: true,
    $or: [
      { bookingType: { $in: [bookingType, 'both'] } },
      { bookingType: { $exists: false } },
      { bookingType: null },
    ],
  }).sort({ startTime: 1 });
};

module.exports = {
  MIN_DURATION,
  MAX_DURATION,
  validateSlotDuration,
  validateTimeRanges,
  getOrCreateSchedule,
  updateSchedule,
  setDateOverride,
  removeDateOverride,
  resolveEffectiveSchedule,
  generateSlotsForDate,
  getAvailableSlots,
};
