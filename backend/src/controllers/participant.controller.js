const Event = require("../models/Event.model");
const Registration = require("../models/Registration.model");
const Ticket = require("../models/Ticket.model");
const crypto = require("crypto");
const Participant = require("../models/Participant.model");
const bcrypt = require("bcrypt");
const Organizer = require("../models/Organizer.model");
const MerchandiseOrder = require("../models/MerchandiseOrder.model");
const { sendTicketEmail } = require("../utils/ticketEmail");
const { generateICS } = require("../utils/calendar");

exports.getParticipantProfile = async (req, res) => {
  try {
    const participant = await Participant.findById(req.user.userId);

    if (!participant) {
      return res.status(404).json({ message: "Participant not found" });
    }

    res.json(participant);

  } catch (err) {
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

exports.updateParticipantProfile = async (req, res) => {
  try {
    const participant = await Participant.findById(req.user.userId);
    if (!participant) {
      return res.status(404).json({ message: "Participant not found" });
    }

    // Editable fields (email + participantType are non-editable)
    const {
      firstName,
      lastName,
      contactNumber,
      collegeName,
      interests,
      followedClubs
    } = req.body;

    if (firstName !== undefined) participant.firstName = firstName;
    if (lastName !== undefined) participant.lastName = lastName;
    if (contactNumber !== undefined) participant.contactNumber = contactNumber;
    if (collegeName !== undefined) participant.collegeName = collegeName;
    if (Array.isArray(interests)) participant.interests = interests;
    if (Array.isArray(followedClubs)) participant.followedClubs = followedClubs;

    await participant.save();
    res.json({ message: "Profile updated", participant });
  } catch (err) {
    res.status(500).json({ message: "Failed to update profile" });
  }
};

// REGISTER FOR NORMAL EVENT
exports.registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.type !== "NORMAL") {
      return res.status(400).json({ message: "Invalid event type" });
    }

    if (event.status !== "PUBLISHED") {
      return res.status(400).json({ message: "Event not open for registration" });
    }

    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      return res.status(400).json({ message: "Registration deadline passed" });
    }

    const count = await Registration.countDocuments({ event: event._id });
    if (event.registrationLimit && count >= event.registrationLimit) {
      return res.status(400).json({ message: "Registration limit reached" });
    }

    const teamCodeRaw = req.body?.teamCode;
    const teamCode =
      typeof teamCodeRaw === "string" ? teamCodeRaw.trim() : "";

    if (event.isTeamEvent) {
      if (!event.teamSize || Number(event.teamSize) < 2) {
        return res.status(400).json({ message: "Invalid team configuration for this event" });
      }
      if (!teamCode) {
        return res.status(400).json({ message: "Team code is required for this event" });
      }
      if (teamCode.length > 64) {
        return res.status(400).json({ message: "Team code too long" });
      }
    }

    const registration = await Registration.create({
      participant: req.user.userId,
      event: event._id,
      teamCode: event.isTeamEvent ? teamCode : undefined,
      formData: req.body.formData || {}
    });

    const ticket = await Ticket.create({
      ticketId: crypto.randomUUID(),
      participant: req.user.userId,
      event: event._id
    });

    // Send ticket email (uses SMTP if configured; otherwise Ethereal preview URL)
    try {
      const participant = await Participant.findById(req.user.userId).select("firstName lastName email");
      const emailResult = await sendTicketEmail({
        to: participant.email,
        participantName: `${participant.firstName} ${participant.lastName}`,
        event,
        ticketId: ticket.ticketId
      });
      // Don't block registration if email fails
      console.log("Ticket email result:", { mode: emailResult.mode, previewUrl: emailResult.previewUrl });
    } catch (emailErr) {
      console.log("Ticket email failed:", emailErr?.message || emailErr);
    }

    res.status(201).json({
      message: "Registered successfully",
      ticketId: ticket.ticketId
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Already registered" });
    }
    res.status(500).json({ message: "Registration failed" });
  }
};

exports.cancelRegistration = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const registration = await Registration.findOne({
      participant: req.user.userId,
      event: event._id
    });

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    registration.status = "CANCELLED";
    await registration.save();

    res.json({ message: "Registration cancelled" });
  } catch (err) {
    res.status(500).json({ message: "Failed to cancel registration" });
  }
};

// MY EVENTS DASHBOARD
exports.getMyEvents = async (req, res) => {
  try {
    const registrations = await Registration.find({
      participant: req.user.userId
    })
      .populate({
        path: "event",
        select: "name startDate endDate type status organizer",
        populate: { path: "organizer", select: "name category contactEmail" }
      })
      .sort({ createdAt: -1 });

    res.json(registrations);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch registrations" });
  }
};

// BATCH CALENDAR EXPORT
exports.exportCalendarBatch = async (req, res) => {
  try {
    const timezone = req.query.timezone || "UTC";
    const reminderMinutes = req.query.reminders
      ? req.query.reminders.split(",").map(m => parseInt(m)).filter(m => !isNaN(m))
      : [1440, 60];

    // Get all upcoming events (registrations + approved merchandise orders)
    const registrations = await Registration.find({
      participant: req.user.userId,
      status: "APPROVED"
    }).populate("event");

    const merchOrders = await MerchandiseOrder.find({
      participant: req.user.userId,
      status: "APPROVED"
    }).populate("event");

    const events = [
      ...registrations.map(r => r.event).filter(e => e && e.status === "PUBLISHED"),
      ...merchOrders.map(o => o.event).filter(e => e && e.status === "PUBLISHED")
    ].filter((e, i, arr) => arr.findIndex(ev => ev._id.toString() === e._id.toString()) === i);

    // Generate combined ICS
    const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const eventsICS = events.map(event => {
      const startDate = new Date(event.startDate).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const endDate = new Date(event.endDate).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const reminders = reminderMinutes.map(min => `
BEGIN:VALARM
TRIGGER:-PT${min}M
ACTION:DISPLAY
DESCRIPTION:Reminder: ${(event.name || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,")}
END:VALARM`).join("");

      return `
BEGIN:VEVENT
UID:${event._id}@felicity
DTSTAMP:${now}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${(event.name || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,")}
DESCRIPTION:${(event.description || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")}
STATUS:CONFIRMED
SEQUENCE:0${reminders}
END:VEVENT`;
    }).join("");

    const icsContent = `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Felicity EMS//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
${eventsICS}
END:VCALENDAR
`.trim();

    res.setHeader("Content-Type", "text/calendar");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="felicity_events_${new Date().toISOString().split("T")[0]}.ics"`
    );

    res.send(icsContent);
  } catch (err) {
    res.status(500).json({ message: "Failed to generate calendar export" });
  }
};

exports.getMyUpcomingEvents = async (req, res) => {
  try {
    const now = new Date();
    const regs = await Registration.find({
      participant: req.user.userId,
      status: "REGISTERED"
    })
      .populate({
        path: "event",
        select: "name type status startDate endDate organizer",
        populate: { path: "organizer", select: "name category contactEmail" }
      })
      .sort({ createdAt: -1 });

    const upcoming = regs
      .filter(r => r.event && r.event.startDate && new Date(r.event.startDate) >= now)
      .map(r => ({
        _id: r._id,
        kind: "NORMAL",
        participationStatus: r.status,
        registeredAt: r.createdAt,
        event: r.event
      }));

    // Upcoming merchandise purchases: APPROVED orders with future event start
    const orders = await MerchandiseOrder.find({
      participant: req.user.userId,
      status: "APPROVED"
    })
      .populate({
        path: "event",
        select: "name type status startDate endDate organizer",
        populate: { path: "organizer", select: "name category contactEmail" }
      })
      .sort({ createdAt: -1 });

    const merchUpcoming = orders
      .filter(o => o.event && o.event.startDate && new Date(o.event.startDate) >= now)
      .map(o => ({
        _id: o._id,
        kind: "MERCHANDISE",
        participationStatus: o.status,
        registeredAt: o.createdAt,
        event: o.event
      }));

    res.json([...upcoming, ...merchUpcoming].sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt)));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch upcoming events" });
  }
};

exports.updateInterests = async (req, res) => {
  const participant = await Participant.findById(req.user.userId);

  participant.interests = req.body.interests;
  await participant.save();

  res.json({ message: "Interests updated" });
};

exports.followOrganizer = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.organizerId);
    if (!organizer) return res.status(404).json({ message: "Organizer not found" });

    const participant = await Participant.findById(req.user.userId);
    if (!participant) return res.status(404).json({ message: "Participant not found" });

    const exists = participant.followedClubs.some(id => id.toString() === organizer._id.toString());
    if (!exists) participant.followedClubs.push(organizer._id);
    await participant.save();

    res.json({ message: "Followed", followedClubs: participant.followedClubs });
  } catch (err) {
    res.status(500).json({ message: "Failed to follow organizer" });
  }
};

exports.unfollowOrganizer = async (req, res) => {
  try {
    const participant = await Participant.findById(req.user.userId);
    if (!participant) return res.status(404).json({ message: "Participant not found" });

    participant.followedClubs = participant.followedClubs.filter(
      id => id.toString() !== req.params.organizerId
    );
    await participant.save();

    res.json({ message: "Unfollowed", followedClubs: participant.followedClubs });
  } catch (err) {
    res.status(500).json({ message: "Failed to unfollow organizer" });
  }
};

exports.getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ participant: req.user.userId })
      .populate({
        path: "event",
        select: "name type status startDate endDate organizer",
        populate: { path: "organizer", select: "name category contactEmail" }
      })
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tickets" });
  }
};

exports.getTicketByTicketId = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      ticketId: req.params.ticketId,
      participant: req.user.userId
    })
      .populate("participant", "firstName lastName email")
      .populate({
        path: "event",
        populate: { path: "organizer", select: "name category description contactEmail" }
      });

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch ticket" });
  }
};

exports.getParticipationRecords = async (req, res) => {
  try {
    const regs = await Registration.find({ participant: req.user.userId })
      .populate({
        path: "event",
        select: "name type status startDate endDate organizer registrationFee",
        populate: { path: "organizer", select: "name category contactEmail" }
      })
      .sort({ createdAt: -1 });

    const orders = await MerchandiseOrder.find({ participant: req.user.userId })
      .populate({
        path: "event",
        select: "name type status startDate endDate organizer",
        populate: { path: "organizer", select: "name category contactEmail" }
      })
      .sort({ createdAt: -1 });

    const tickets = await Ticket.find({ participant: req.user.userId });
    const ticketByEvent = new Map();
    tickets.forEach(t => {
      ticketByEvent.set(t.event.toString(), t.ticketId);
    });

    const registrationRecords = regs.map(r => ({
      id: r._id,
      recordType: "REGISTRATION",
      eventType: r.event?.type,
      organizer: r.event?.organizer,
      event: r.event,
      participationStatus: r.status, // REGISTERED / CANCELLED
      teamName: null,
      ticketId: r.event ? (ticketByEvent.get(r.event._id.toString()) || null) : null,
      createdAt: r.createdAt
    }));

    const orderRecords = orders.map(o => ({
      id: o._id,
      recordType: "MERCH_ORDER",
      eventType: o.event?.type,
      organizer: o.event?.organizer,
      event: o.event,
      participationStatus: o.status, // CREATED / PENDING / APPROVED / REJECTED
      teamName: null,
      ticketId: o.event ? (ticketByEvent.get(o.event._id.toString()) || null) : null,
      createdAt: o.createdAt
    }));

    res.json([...registrationRecords, ...orderRecords].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch participation records" });
  }
};

exports.changeParticipantPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Missing password fields" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const participant = await Participant.findById(req.user.userId);
    if (!participant) return res.status(404).json({ message: "Participant not found" });

    const ok = await bcrypt.compare(currentPassword, participant.password);
    if (!ok) return res.status(400).json({ message: "Current password is incorrect" });

    participant.password = await bcrypt.hash(newPassword, 10);
    await participant.save();

    res.json({ message: "Password updated" });
  } catch (err) {
    res.status(500).json({ message: "Failed to update password" });
  }
};

