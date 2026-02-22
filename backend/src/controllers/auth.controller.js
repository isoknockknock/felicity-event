const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const Participant = require("../models/Participant.model");
const Organizer = require("../models/Organizer.model");
const Admin = require("../models/Admin.model");

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });
};

// PARTICIPANT REGISTRATION
exports.registerParticipant = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      participantType
    } = req.body;

    if (participantType === "IIIT" && !email.endsWith("@iiit.ac.in")) {
      return res.status(400).json({ message: "IIIT email required" });
    }

    const existing = await Participant.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const participant = await Participant.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      participantType
    });

    const token = generateToken(participant._id, "PARTICIPANT");

    res.status(201).json({ token });
  } catch (err) {
    res.status(500).json({ message: "Registration failed" });
  }
};

// LOGIN (ALL ROLES)
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    let user;

    if (role === "PARTICIPANT") {
      user = await Participant.findOne({ email });
    } else if (role === "ORGANIZER") {
      user = await Organizer.findOne({ email, isActive: true });
    } else if (role === "ADMIN") {
      user = await Admin.findOne({ email });
    } else {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id, role);
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: "Login failed" });
  }
};
