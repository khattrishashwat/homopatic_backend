const mongoose = require('mongoose');

const TimeRangeSchema = new mongoose.Schema(
  {
    startTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'startTime must be in HH:mm 24-hour format'],
    },
    endTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'endTime must be in HH:mm 24-hour format'],
    },
  },
  { _id: false }
);

const DayScheduleSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0, // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      max: 6,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    timeRanges: {
      type: [TimeRangeSchema],
      default: [],
    },
  },
  { _id: false }
);

const DateOverrideSchema = new mongoose.Schema(
  {
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'],
    },
    isClosed: {
      type: Boolean,
      default: false,
    },
    timeRanges: {
      type: [TimeRangeSchema],
      default: [],
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

const BookingScheduleSchema = new mongoose.Schema(
  {
    bookingType: {
      type: String,
      enum: ['online', 'offline'],
      required: true,
      unique: true,
    },
    slotDuration: {
      type: Number,
      required: true,
      min: [15, 'Slot duration cannot be less than 15 minutes'],
      max: [35, 'Slot duration cannot be more than 35 minutes'],
      default: 30,
    },
    defaultSchedule: {
      enabled: {
        type: Boolean,
        default: true,
      },
      timeRanges: {
        type: [TimeRangeSchema],
        default: [{ startTime: '10:00', endTime: '20:00' }],
      },
    },
    weeklySchedule: {
      type: [DayScheduleSchema],
      default: [
        { dayOfWeek: 1, enabled: true, timeRanges: [{ startTime: '10:00', endTime: '18:00' }] }, // Mon
        { dayOfWeek: 2, enabled: true, timeRanges: [{ startTime: '10:00', endTime: '18:00' }] }, // Tue
        { dayOfWeek: 3, enabled: true, timeRanges: [{ startTime: '10:00', endTime: '18:00' }] }, // Wed
        { dayOfWeek: 4, enabled: true, timeRanges: [{ startTime: '10:00', endTime: '18:00' }] }, // Thu
        { dayOfWeek: 5, enabled: true, timeRanges: [{ startTime: '10:00', endTime: '18:00' }] }, // Fri
        { dayOfWeek: 6, enabled: true, timeRanges: [{ startTime: '10:00', endTime: '18:00' }] }, // Sat
        { dayOfWeek: 0, enabled: false, timeRanges: [] }, // Sun
      ],
    },
    dateOverrides: {
      type: [DateOverrideSchema],
      default: [],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BookingSchedule', BookingScheduleSchema);
