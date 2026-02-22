const Organizer = require("../models/Organizer.model");

exports.getOrganizerProfile = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.user.id).select("-password");

    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    res.json(organizer);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
