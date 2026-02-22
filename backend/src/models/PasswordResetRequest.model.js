const mongoose = require("mongoose");

const passwordResetRequestSchema = new mongoose.Schema(
  {
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organizer",
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["REQUESTED", "APPROVED", "REJECTED"],
      default: "REQUESTED"
    },
    adminComments: {
      type: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "PasswordResetRequest",
  passwordResetRequestSchema
);
