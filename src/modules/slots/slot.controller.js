const slotService = require('./slot.service');
const validation = require('./slot.validation');

exports.getAvailableSlots = async (req, res, next) => {
  try {
    const slots = await slotService.getAvailableSlots();
    res.json({ success: true, data: slots });
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
