const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Participant",
      required: true
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },
    status: {
      type: String,
      enum: ["REGISTERED", "CANCELLED"],
      default: "REGISTERED"
    },
    // Optional team identifier for team events
    teamCode: { type: String },
    // Custom form responses
    formData: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

registrationSchema.index({ participant: 1, event: 1 }, { unique: true });

module.exports = mongoose.model("Registration", registrationSchema);
