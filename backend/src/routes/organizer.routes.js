const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");

const Organizer = require("../models/Organizer.model");
const Event = require("../models/Event.model");
const { getOrganizers } = require("../controllers/admin.controller");

console.log("Organizer routes loaded");

router.get(
  "/me",
  auth,
  requireRole("ORGANIZER"),
  async (req, res) => {
    console.log("REQ USER:", req.user);
    try {
      const organizer = await Organizer.findById(req.user.userId).select("-password");

      if (!organizer) {
        return res.status(404).json({ message: "Organizer not found" });
      }

      res.json(organizer);
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// UPDATE ORGANIZER PROFILE
router.put(
  "/me",
  auth,
  requireRole("ORGANIZER"),
  async (req, res) => {
    try {
      const organizer = await Organizer.findById(req.user.userId);

      if (!organizer) {
        return res.status(404).json({ message: "Organizer not found" });
      }

      // Allow updating: name, category, description, contactEmail, contactNumber
      // Email (login email) is NOT editable
      const { name, category, description, contactEmail, contactNumber, discordWebhookUrl } = req.body;

      if (name) organizer.name = name;
      if (category !== undefined) organizer.category = category;
      if (description !== undefined) organizer.description = description;
      if (contactEmail !== undefined) organizer.contactEmail = contactEmail;
      if (contactNumber !== undefined) organizer.contactNumber = contactNumber;
      if (discordWebhookUrl !== undefined) organizer.discordWebhookUrl = discordWebhookUrl;

      await organizer.save();

      res.json({ message: "Profile updated successfully", organizer });
    } catch (err) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  }
);

// PUBLIC LISTING
router.get("/", getOrganizers);

// PUBLIC ORGANIZER DETAIL (Participant View)
router.get("/:id", async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id).select(
      "name category description contactEmail contactNumber email isActive"
    );

    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    // Only expose active organizers in participant view
    if (organizer.isActive === false) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    const now = new Date();
    const events = await Event.find({
      organizer: organizer._id,
      status: { $in: ["PUBLISHED", "ONGOING", "COMPLETED", "CLOSED"] }
    }).sort({ startDate: 1 });

    const upcoming = events.filter(e => e.startDate && new Date(e.startDate) >= now);
    const past = events.filter(e => e.endDate && new Date(e.endDate) < now);

    res.json({ organizer, upcoming, past });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch organizer detail" });
  }
});

module.exports = router;
