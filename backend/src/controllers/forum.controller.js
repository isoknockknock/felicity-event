const ForumMessage = require("../models/ForumMessage.model");
const Registration = require("../models/Registration.model");

// GET MESSAGE HISTORY FOR EVENT
exports.getMessages = async (req, res) => {
  try {
    const messages = await ForumMessage.find({
      event: req.params.eventId
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

// ORGANIZER DELETE MESSAGE (Moderation)
exports.deleteMessage = async (req, res) => {
  try {
    await ForumMessage.findByIdAndDelete(req.params.messageId);
    res.json({ message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete message" });
  }
};

// ORGANIZER PIN/UNPIN MESSAGE
exports.togglePinMessage = async (req, res) => {
  try {
    const msg = await ForumMessage.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    msg.isPinned = !msg.isPinned;
    await msg.save();

    res.json({ message: msg.isPinned ? "Message pinned" : "Message unpinned", data: msg });
  } catch (err) {
    res.status(500).json({ message: "Failed to toggle pin" });
  }
};

// REACT TO A MESSAGE
exports.reactToMessage = async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ message: "Emoji required" });

    const msg = await ForumMessage.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    const userId = req.user.userId;
    const existingIdx = msg.reactions.findIndex(
      (r) => r.emoji === emoji && r.userId.toString() === userId
    );

    if (existingIdx >= 0) {
      // Toggle off
      msg.reactions.splice(existingIdx, 1);
    } else {
      msg.reactions.push({ emoji, userId });
    }

    await msg.save();
    res.json({ message: "Reaction updated", data: msg });
  } catch (err) {
    res.status(500).json({ message: "Failed to react" });
  }
};

// GET THREAD REPLIES
exports.getThreadReplies = async (req, res) => {
  try {
    const replies = await ForumMessage.find({
      parentMessage: req.params.messageId
    }).sort({ createdAt: 1 });

    res.json(replies);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch thread replies" });
  }
};
