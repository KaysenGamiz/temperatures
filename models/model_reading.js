const mongoose = require('mongoose');

const readingSchema = new mongoose.Schema({
  device_id: {
    type: String,
    required: true
  },
  temperature: {
    type: Number,
    required: true
  },
  humidity: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    min: 1,
    max: 12,
    required: true
  },
  day: {
    type: Number,
    min: 1,
    max: 31,
    required: true
  },
  hour: {
    type: Number,
    min: 0,
    max: 23,
    required: true
  },
  minute: {
    type: Number,
    min: 0,
    max: 59,
    required: true
  }
});

module.exports = mongoose.model('readings', readingSchema);
