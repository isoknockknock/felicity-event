const bcrypt = require("bcrypt");
const Organizer = require("../models/Organizer.model");
const Admin = require("../models/Admin.model");

// CREATE ORGANIZER
exports.createOrganizer = async (req, res) => {
  try {
    const { name, category, description, email } = req.body;

    const existing = await Organizer.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Organizer already exists" });
    }

    const generatedPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    const organizer = await Organizer.create({
      name,
      category,
      description,
      email,
      password: hashedPassword
    });

    res.status(201).json({
      message: "Organizer created successfully",
      loginEmail: email,
      temporaryPassword: generatedPassword
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to create organizer" });
  }
};

// LIST ORGANIZERS
exports.getOrganizers = async (req, res) => {
  try {
    const organizers = await Organizer.find().select("-password");
    res.json(organizers);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch organizers" });
  }
};

// DISABLE ORGANIZER
exports.disableOrganizer = async (req, res) => {
  try {
    const organizer = await Organizer.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    res.json({ message: "Organizer disabled successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to disable organizer" });
  }
};

// ARCHIVE ORGANIZER
exports.archiveOrganizer = async (req, res) => {
  try {
    const organizer = await Organizer.findByIdAndUpdate(
      req.params.id,
      { isActive: false, isArchived: true, archivedAt: new Date() },
      { new: true }
    );

    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    res.json({ message: "Organizer archived successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to archive organizer" });
  }
};

// PERMANENTLY DELETE ORGANIZER
exports.deleteOrganizer = async (req, res) => {
  try {
    const organizer = await Organizer.findByIdAndDelete(req.params.id);

    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    res.json({ message: "Organizer permanently deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete organizer" });
  }
};

exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select("-password");
    res.json(admin);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


