const Attendance = require("../models/Attendance.model");
const Ticket = require("../models/Ticket.model");
const Event = require("../models/Event.model");
const Registration = require("../models/Registration.model");
const Participant = require("../models/Participant.model");

// SCAN QR / MARK ATTENDANCE
exports.scanTicket = async (req, res) => {
  try {
    const { ticketId } = req.body;

    const ticket = await Ticket.findOne({ ticketId }).populate("event");

    if (!ticket) {
      return res.status(404).json({ message: "Invalid ticket" });
    }

    // Verify organizer owns the event
    if (ticket.event.organizer.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized for this event" });
    }

    // Prevent duplicate scans
    const existing = await Attendance.findOne({ ticket: ticket._id });
    if (existing) {
      return res.status(400).json({
        message: "Ticket already scanned",
        scannedAt: existing.scannedAt
      });
    }

    const attendance = await Attendance.create({
      ticket: ticket._id,
      event: ticket.event._id,
      participant: ticket.participant,
      scannedBy: req.user.userId
    });

    // Populate participant info for response
    const participantInfo = await Participant.findById(ticket.participant).select("firstName lastName email");

    res.json({
      message: "Attendance marked",
      participant: participantInfo,
      event: ticket.event.name,
      scannedAt: attendance.scannedAt
    });
  } catch (err) {
    res.status(500).json({ message: "Scan failed" });
  }
};

// MANUAL OVERRIDE - Mark attendance without QR
exports.manualOverride = async (req, res) => {
  try {
    const { ticketId, reason } = req.body;

    if (!ticketId || !reason) {
      return res.status(400).json({ message: "Ticket ID and reason are required" });
    }

    const ticket = await Ticket.findOne({ ticketId }).populate("event");

    if (!ticket) {
      return res.status(404).json({ message: "Invalid ticket" });
    }

    if (ticket.event.organizer.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized for this event" });
    }

    // Check if already marked
    const existing = await Attendance.findOne({ ticket: ticket._id });
    if (existing) {
      return res.status(400).json({
        message: "Attendance already marked for this ticket",
        scannedAt: existing.scannedAt,
        isManualOverride: existing.isManualOverride
      });
    }

    const attendance = await Attendance.create({
      ticket: ticket._id,
      event: ticket.event._id,
      participant: ticket.participant,
      scannedBy: req.user.userId,
      isManualOverride: true,
      overrideReason: reason
    });

    const participantInfo = await Participant.findById(ticket.participant).select("firstName lastName email");

    res.json({
      message: "Attendance marked manually (override)",
      participant: participantInfo,
      event: ticket.event.name,
      scannedAt: attendance.scannedAt,
      isManualOverride: true,
      overrideReason: reason
    });
  } catch (err) {
    res.status(500).json({ message: "Manual override failed" });
  }
};

// GET ATTENDANCE LIST FOR EVENT
exports.getAttendanceForEvent = async (req, res) => {
  try {
    const attendance = await Attendance.find({ event: req.params.eventId })
      .populate({
        path: "ticket",
        populate: {
          path: "participant",
          select: "firstName lastName email"
        }
      })
      .sort({ scannedAt: -1 });

    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch attendance" });
  }
};

// LIVE ATTENDANCE DASHBOARD STATS
exports.getAttendanceDashboard = async (req, res) => {
  try {
    const eventId = req.params.eventId;

    // Total registered participants
    const totalRegistered = await Registration.countDocuments({
      event: eventId,
      status: "REGISTERED"
    });

    // Total tickets
    const totalTickets = await Ticket.countDocuments({ event: eventId });

    // Total scanned (attended)
    const scanned = await Attendance.find({ event: eventId })
      .populate({
        path: "ticket",
        populate: {
          path: "participant",
          select: "firstName lastName email"
        }
      })
      .sort({ scannedAt: -1 });

    const scannedTicketIds = new Set(scanned.map(a => a.ticket?._id?.toString()));

    // Not yet scanned tickets
    const allTickets = await Ticket.find({ event: eventId })
      .populate("participant", "firstName lastName email");

    const notScanned = allTickets.filter(
      t => !scannedTicketIds.has(t._id.toString())
    );

    const manualOverrides = scanned.filter(a => a.isManualOverride);

    res.json({
      totalRegistered,
      totalTickets,
      scannedCount: scanned.length,
      notScannedCount: notScanned.length,
      scanned: scanned.map(a => ({
        _id: a._id,
        participant: a.ticket?.participant,
        ticketId: a.ticket?.ticketId,
        scannedAt: a.scannedAt,
        isManualOverride: a.isManualOverride,
        overrideReason: a.overrideReason
      })),
      notScanned: notScanned.map(t => ({
        _id: t._id,
        ticketId: t.ticketId,
        participant: t.participant
      })),
      manualOverrides: manualOverrides.map(a => ({
        _id: a._id,
        participant: a.ticket?.participant,
        ticketId: a.ticket?.ticketId,
        scannedAt: a.scannedAt,
        overrideReason: a.overrideReason
      }))
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch attendance dashboard" });
  }
};

// EXPORT ATTENDANCE AS CSV
exports.exportAttendanceCSV = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const attendance = await Attendance.find({ event: eventId })
      .populate({
        path: "ticket",
        populate: {
          path: "participant",
          select: "firstName lastName email contactNumber"
        }
      })
      .sort({ scannedAt: 1 });

    const headers = ["Name", "Email", "Contact", "Ticket ID", "Scanned At", "Manual Override", "Override Reason"];
    const rows = attendance.map(a => [
      `${a.ticket?.participant?.firstName || ""} ${a.ticket?.participant?.lastName || ""}`,
      a.ticket?.participant?.email || "",
      a.ticket?.participant?.contactNumber || "",
      a.ticket?.ticketId || "",
      a.scannedAt ? new Date(a.scannedAt).toLocaleString() : "",
      a.isManualOverride ? "Yes" : "No",
      a.overrideReason || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${event.name.replace(/[^a-z0-9]/gi, "_")}_attendance.csv"`
    );
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ message: "Failed to export attendance" });
  }
};
