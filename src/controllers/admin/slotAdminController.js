const slotService = require('../../services/slotService');

exports.createSlot = async (req, res, next) => {
  try {
    const slot = await slotService.createSlot(req.body);
    res.status(201).json({ success: true, data: slot });
  } catch (error) {
    next(error);
  }
};

exports.listSlots = async (req, res, next) => {
  try {
    const slots = await slotService.getAllSlots();
    res.json({ success: true, data: slots });
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
    res.json({
      success: true,
      message: 'All slots are available now',
      data: { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount },
    });
  } catch (error) {
    next(error);
  }
};

exports.generateWeekendSlots = async (req, res, next) => {
  try {
    const result = await slotService.generateWeekendSlots({
      daysAhead: req.body.daysAhead,
      intervalMinutes: req.body.intervalMinutes,
    });

    res.json({
      success: true,
      message: 'Weekend slots generated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
