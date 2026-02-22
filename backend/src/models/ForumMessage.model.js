const mongoose = require("mongoose");

const forumMessageSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    senderRole: {
      type: String,
      enum: ["PARTICIPANT", "ORGANIZER"],
      required: true
    },
    senderName: {
      type: String,
      default: ""
    },
    content: {
      type: String,
      required: true
    },
    isAnnouncement: {
      type: Boolean,
      default: false
    },
    // Threading support
    parentMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ForumMessage",
      default: null
    },
    // Pinning support
    isPinned: {
      type: Boolean,
      default: false
    },
    // Reactions support
    reactions: [
      {
        emoji: { type: String, required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, required: true }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("ForumMessage", forumMessageSchema);
