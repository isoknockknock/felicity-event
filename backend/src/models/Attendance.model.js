const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
      unique: true
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Participant"
    },
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organizer",
      required: true
    },
    scannedAt: {
      type: Date,
      default: Date.now
    },
    // Manual override support
    isManualOverride: {
      type: Boolean,
      default: false
    },
    overrideReason: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);
