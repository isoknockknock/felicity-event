const mongoose = require("mongoose");

const organizerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String },
    description: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    contactEmail: { type: String },
    contactNumber: { type: String },
    isActive: { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date },
    discordWebhookUrl: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Organizer", organizerSchema);
