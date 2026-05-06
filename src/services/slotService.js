const Slot = require('../models/Slot');

const WEEKEND_DAYS = [0, 6];
const DEFAULT_INTERVAL_MINUTES = 20;
const DEFAULT_DAYS_AHEAD = 30;
const SLOT_START_HOUR = '10';
const SLOT_END_HOUR = '20';

const validateHourFormat = (hour, name) => {
  if (!/^\d{2}$/.test(hour)) {
    throw new Error(`${name} must be in HH format`);
  }

  const value = Number(hour);
  if (value < 0 || value > 23) {
    throw new Error(`${name} must be between 00 and 23`);
  }

  return value;
};

const getSlotIntervalMinutes = (intervalMinutes) => {
  const interval = Number(intervalMinutes || process.env.SLOT_INTERVAL_MINUTES || DEFAULT_INTERVAL_MINUTES);
  if (!Number.isInteger(interval) || interval <= 0) {
    throw new Error('Slot interval must be a positive number');
  }

  return interval;
};

const getDaysAhead = (daysAhead) => {
  const days = Number(daysAhead || DEFAULT_DAYS_AHEAD);
  if (!Number.isInteger(days) || days < 0) {
    throw new Error('daysAhead must be a positive number');
  }

  return days;
};

const isWeekend = (date) => WEEKEND_DAYS.includes(date.getDay());

const getDayBounds = (date) => {
  const startHour = validateHourFormat(SLOT_START_HOUR, 'SLOT_START_HOUR');
  const endHour = validateHourFormat(SLOT_END_HOUR, 'SLOT_END_HOUR');

  if (startHour >= endHour) {
    throw new Error('SLOT_START_HOUR must be earlier than SLOT_END_HOUR');
  }

  const start = new Date(date);
  start.setHours(startHour, 0, 0, 0);

  const end = new Date(date);
  end.setHours(endHour, 0, 0, 0);

  return { start, end };
};

const normalizeDay = (date) => {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const ensureWeekendSlot = (startTime) => {
  if (!isWeekend(startTime)) {
    const error = new Error('Slots can only be created for Saturday and Sunday');
    error.statusCode = 400;
    throw error;
  }
};

exports.createSlot = async (data) => {
  ensureWeekendSlot(new Date(data.startTime));
  return Slot.create(data);
};

exports.getAllSlots = async () => {
  return Slot.find({
    $expr: { $in: [{ $dayOfWeek: '$startTime' }, [1, 7]] },
  });
};

exports.getAvailableSlots = async () => {
  return Slot.find({
    available: true,
    $expr: { $in: [{ $dayOfWeek: '$startTime' }, [1, 7]] },
  });
};

exports.updateSlot = async (id, data) => {
  const slot = await Slot.findById(id);
  if (!slot) {
    const error = new Error('Slot not found');
    error.statusCode = 404;
    throw error;
  }
  Object.assign(slot, data);

  if (data.startTime) {
    ensureWeekendSlot(new Date(data.startTime));
  }

  return slot.save();
};

exports.makeAllSlotsAvailable = async () => {
  return Slot.updateMany(
    { $expr: { $in: [{ $dayOfWeek: '$startTime' }, [1, 7]] } },
    { $set: { available: true } },
  );
};

exports.deleteWeekdaySlots = async () => {
  return Slot.deleteMany({
    $expr: { $not: [{ $in: [{ $dayOfWeek: '$startTime' }, [1, 7]] }] },
  });
};

exports.generateWeekendSlots = async ({ daysAhead, intervalMinutes } = {}) => {
  const interval = getSlotIntervalMinutes(intervalMinutes);
  const days = getDaysAhead(daysAhead);
  const today = normalizeDay(new Date());
  const endDate = addDays(today, days);
  const slots = [];

  await exports.deleteWeekdaySlots();

  for (let day = new Date(today); day <= endDate; day = addDays(day, 1)) {
    if (!isWeekend(day)) {
      continue;
    }

    const { start, end } = getDayBounds(day);

    for (let startTime = new Date(start); startTime < end; startTime = new Date(startTime.getTime() + interval * 60000)) {
      const endTime = new Date(startTime.getTime() + interval * 60000);
      if (endTime > end) {
        break;
      }

      slots.push({ startTime: new Date(startTime), endTime, available: true });
    }
  }

  const operations = slots.map((slot) => ({
    updateOne: {
      filter: { startTime: slot.startTime, endTime: slot.endTime },
      update: { $setOnInsert: slot },
      upsert: true,
    },
  }));

  if (!operations.length) {
    return { createdOrMatchedSlots: 0 };
  }

  const result = await Slot.bulkWrite(operations);
  return {
    createdOrMatchedSlots: slots.length,
    insertedCount: result.upsertedCount || 0,
    matchedCount: result.matchedCount || 0,
  };
};

exports.countSlots = async () => {
  return Slot.countDocuments();
};
