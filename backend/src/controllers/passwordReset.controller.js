const bcrypt = require("bcrypt");
const PasswordResetRequest = require("../models/PasswordResetRequest.model");
const Organizer = require("../models/Organizer.model");

// ORGANIZER: REQUEST RESET
exports.requestReset = async (req, res) => {
  try {
    const existing = await PasswordResetRequest.findOne({
      organizer: req.user.userId,
      status: "REQUESTED"
    });

    if (existing) {
      return res.status(400).json({ message: "Reset request already pending" });
    }

    await PasswordResetRequest.create({
      organizer: req.user.userId,
      reason: req.body.reason
    });

    res.json({ message: "Password reset request submitted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to submit request" });
  }
};

// ADMIN: VIEW ALL REQUESTS
exports.getRequests = async (req, res) => {
  try {
    const requests = await PasswordResetRequest.find()
      .populate("organizer", "name email")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch requests" });
  }
};

// ADMIN: APPROVE RESET
exports.approveReset = async (req, res) => {
  try {
    const request = await PasswordResetRequest.findById(req.params.id)
      .populate("organizer");

    if (!request || request.status !== "REQUESTED") {
      return res.status(400).json({ message: "Invalid request" });
    }

    const newPassword = Math.random().toString(36).slice(-8);
    const hashed = await bcrypt.hash(newPassword, 10);

    request.organizer.password = hashed;
    await request.organizer.save();

    request.status = "APPROVED";
    request.adminComments = req.body.comments || "";
    await request.save();

    res.json({
      message: "Password reset approved",
      newPassword
    });
  } catch (err) {
    res.status(500).json({ message: "Approval failed" });
  }
};

// ADMIN: REJECT RESET
exports.rejectReset = async (req, res) => {
  try {
    const request = await PasswordResetRequest.findById(req.params.id);

    if (!request || request.status !== "REQUESTED") {
      return res.status(400).json({ message: "Invalid request" });
    }

    request.status = "REJECTED";
    request.adminComments = req.body.comments || "";
    await request.save();

    res.json({ message: "Password reset rejected" });
  } catch (err) {
    res.status(500).json({ message: "Rejection failed" });
  }
};
