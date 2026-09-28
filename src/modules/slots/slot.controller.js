const slotService = require('./slot.service');
const validation = require('./slot.validation');

exports.getAvailableSlots = async (req, res, next) => {
  try {
    const slots = await slotService.getAvailableSlots(req.query);
    res.json({ success: true, data: slots });
  } catch (error) {
    next(error);
  }
};

exports.getSchedule = async (req, res, next) => {
  try {
    const type = req.params.type || 'online';
    const schedule = await slotService.getSchedule(type);
    res.json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
};

exports.updateSchedule = async (req, res, next) => {
  try {
    const type = req.params.type || 'online';
    const schedule = await slotService.updateSchedule(type, req.body, req.user?._id);
    res.json({ success: true, message: 'Schedule updated successfully', data: schedule });
  } catch (error) {
    next(error);
  }
};

exports.setDateOverride = async (req, res, next) => {
  try {
    const type = req.params.type || 'online';
    const schedule = await slotService.setDateOverride(type, req.body, req.user?._id);
    res.json({ success: true, message: 'Date override saved', data: schedule });
  } catch (error) {
    next(error);
  }
};

exports.removeDateOverride = async (req, res, next) => {
  try {
    const type = req.params.type || 'online';
    const date = req.params.date;
    const schedule = await slotService.removeDateOverride(type, date, req.user?._id);
    res.json({ success: true, message: 'Date override removed', data: schedule });
  } catch (error) {
    next(error);
  }
};

exports.previewSlots = async (req, res, next) => {
  try {
    const type = req.params.type || 'online';
    const date = req.query.date;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date query param is required' });
    }
    const slots = await slotService.generateSlotsForDate(type, date);
    const effective = await slotService.resolveEffectiveSchedule(type, date);
    res.json({ success: true, data: { slots, effective } });
  } catch (error) {
    next(error);
  }
};

exports.getAllSlots = async (req, res, next) => {
  try {
    const slots = await slotService.getAllSlots();
    res.json({ success: true, data: slots });
  } catch (error) {
    next(error);
  }
};

exports.createSlot = async (req, res, next) => {
  try {
    validation.validateCreateSlot(req.body);
    const slot = await slotService.createSlot(req.body);
    res.status(201).json({ success: true, data: slot });
  } catch (error) {
    next(error);
  }
};

exports.updateSlot = async (req, res, next) => {
  try {
    const slot = await slotService.updateSlot(req.params.id, req.body);
    res.json({ success: true, data: slot });
  } catch (error) {
    next(error);
  }
};

exports.makeAllSlotsAvailable = async (req, res, next) => {
  try {
    const result = await slotService.makeAllSlotsAvailable();
    res.json({ success: true, message: 'All weekend slots are now available', data: result });
  } catch (error) {
    next(error);
  }
};

exports.generateWeekendSlots = async (req, res, next) => {
  try {
    validation.validateGenerateWeekendSlots(req.body);
    const result = await slotService.generateWeekendSlots({
      daysAhead: req.body.daysAhead,
      intervalMinutes: req.body.intervalMinutes,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
