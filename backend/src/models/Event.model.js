const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    type: {
      type: String,
      enum: ["NORMAL", "MERCHANDISE"],
      required: true
    },
    eligibility: { type: String },
    registrationDeadline: { type: Date },
    startDate: { type: Date },
    endDate: { type: Date },
    registrationLimit: { type: Number },
    registrationFee: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "ONGOING", "COMPLETED", "CLOSED"],
      default: "DRAFT"
    },

    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organizer",
      required: true
    },

    tags: [String],

    // Team events (Normal only; optional)
    isTeamEvent: { type: Boolean, default: false },
    teamSize: { type: Number },

    // Normal event form (later)
    registrationForm: [
      {
        label: { type: String },
        type: { type: String },
        required: { type: Boolean, default: false },
        options: [String]
      }
    ],

    // Merchandise-only
    merchandiseItems: [
      {
        name: String,
        price: Number,
        stock: Number,
        sizeOptions: [String], // e.g., ["S", "M", "L", "XL"]
        colorOptions: [String], // e.g., ["Red", "Blue", "Black"]
        purchaseLimitPerParticipant: { type: Number, default: 1 } // Max quantity per participant
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
