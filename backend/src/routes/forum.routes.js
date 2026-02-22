const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");
const forumCtrl = require("../controllers/forum.controller");

// GET messages for an event
router.get("/:eventId", auth, forumCtrl.getMessages);

// DELETE message (organizer moderation)
router.delete("/:messageId", auth, requireRole("ORGANIZER"), forumCtrl.deleteMessage);

// PIN/UNPIN message (organizer moderation)
router.patch("/:messageId/pin", auth, requireRole("ORGANIZER"), forumCtrl.togglePinMessage);

// REACT to a message
router.post("/:messageId/react", auth, forumCtrl.reactToMessage);

// GET thread replies for a message
router.get("/:messageId/replies", auth, forumCtrl.getThreadReplies);

module.exports = router;
