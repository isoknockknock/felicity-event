const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    participantType: {
      type: String,
      enum: ["IIIT", "NON_IIIT"],
      required: true
    },
    collegeName: { type: String },
    contactNumber: { type: String },
    interests: [String],
    followedClubs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Organizer" }],
    onboardingCompleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Participant", participantSchema);
