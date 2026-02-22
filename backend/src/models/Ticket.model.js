const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, unique: true, required: true },
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Participant",
      required: true
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ticket", ticketSchema);
