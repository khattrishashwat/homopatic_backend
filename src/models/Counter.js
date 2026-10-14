const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, required: true, default: 100 },
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Counter', CounterSchema);
