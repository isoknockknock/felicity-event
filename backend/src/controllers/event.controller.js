const Event = require("../models/Event.model");
const Registration = require("../models/Registration.model");
const Ticket = require("../models/Ticket.model");
const Attendance = require("../models/Attendance.model");
const Participant = require("../models/Participant.model");
const Organizer = require("../models/Organizer.model");
const { generateICS, generateGoogleCalendarUrl, generateOutlookCalendarUrl } = require("../utils/calendar");
const { postToDiscord } = require("../utils/discord");

// CREATE EVENT (DRAFT)
exports.createEvent = async (req, res) => {
  try {
    const event = await Event.create({
      ...req.body,
      organizer: req.user.userId
    });

    res.status(201).json(event);
  } catch (err) {
    console.error("Event Creation Error:", err);
    res.status(500).json({ message: "Failed to create event", error: err.message });
  }
};

// UPDATE EVENT (DRAFT ONLY)
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.organizer.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not your event" });
    }

    if (event.status !== "DRAFT") {
      return res.status(400).json({ message: "Cannot edit published event" });
    }

    Object.assign(event, req.body);
    await event.save();

    res.json(event);
  } catch (err) {
    res.status(500).json({ message: "Failed to update event" });
  }
};

exports.getOrganizerEvents = async (req, res) => {
  try {
    const events = await Event.find({
      organizer: req.user.userId
    }).sort({ createdAt: -1 });

    res.json(events);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch organizer events" });
  }
};


// PUBLISH EVENT
exports.publishEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.organizer.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not your event" });
    }

    if (event.status !== "DRAFT") {
      return res.status(400).json({ message: "Event already published" });
    }

    event.status = "PUBLISHED";
    await event.save();

    // Auto-post to Discord if webhook is configured
    try {
      const organizer = await Organizer.findById(event.organizer);
      if (organizer && organizer.discordWebhookUrl) {
        await postToDiscord(organizer.discordWebhookUrl, event);
      }
    } catch (discordErr) {
      console.error("Discord post failed:", discordErr.message);
    }

    res.json({ message: "Event published successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to publish event" });
  }
};

// LIST EVENTS (PUBLIC)
exports.getEvents = async (req, res) => {
  try {
    const query = { status: "PUBLISHED" };

    if (req.query.type) {
      query.type = req.query.type;
    }

    if (req.query.eligibility) {
      query.eligibility = req.query.eligibility;
    }

    // Date range filter (start/end are ISO strings)
    if (req.query.start || req.query.end) {
      query.startDate = {};
      if (req.query.start) query.startDate.$gte = new Date(req.query.start);
      if (req.query.end) query.startDate.$lte = new Date(req.query.end);
    }

    // Simple partial search on name (fuzzy handled client-side)
    if (req.query.q) {
      query.name = { $regex: req.query.q, $options: "i" };
    }

    const events = await Event.find(query)
      .populate("organizer", "name category description contactEmail");

    res.json(events);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch events" });
  }
};

// TRENDING EVENTS (Top 5 by registrations in last 24h)
exports.getTrendingEvents = async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const trending = await Registration.aggregate([
      { $match: { createdAt: { $gte: since }, status: "REGISTERED" } },
      { $group: { _id: "$event", registrations24h: { $sum: 1 } } },
      { $sort: { registrations24h: -1 } },
      { $limit: 5 }
    ]);

    const eventIds = trending.map(t => t._id);
    const events = await Event.find({ _id: { $in: eventIds }, status: "PUBLISHED" })
      .populate("organizer", "name category description contactEmail");

    const byId = new Map(events.map(e => [e._id.toString(), e]));
    const result = trending
      .map(t => {
        const e = byId.get(t._id.toString());
        if (!e) return null;
        return { ...e.toObject(), registrations24h: t.registrations24h };
      })
      .filter(Boolean);

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch trending events" });
  }
};

// EVENT DETAILS
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("organizer", "name category description email");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(event);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch event" });
  }
};

// PUBLIC: lightweight stats for blocking UI
exports.getEventPublicStats = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).select(
      "registrationLimit registrationFee type merchandiseItems"
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const registrationCount = await Registration.countDocuments({
      event: event._id,
      status: "REGISTERED"
    });

    res.json({
      registrationCount,
      registrationLimit: event.registrationLimit || 0,
      limitReached: !!(event.registrationLimit && registrationCount >= event.registrationLimit),
      merchandiseItems: event.type === "MERCHANDISE" ? event.merchandiseItems : []
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch event stats" });
  }
};



// ADD TO CALENDAR (ICS download)
exports.addToCalendar = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event || event.status !== "PUBLISHED") {
      return res.status(404).json({ message: "Event not found" });
    }

    const timezone = req.query.timezone || "UTC";
    const reminderMinutes = req.query.reminders
      ? req.query.reminders.split(",").map(m => parseInt(m)).filter(m => !isNaN(m))
      : [1440, 60];

    const icsContent = generateICS(event, { timezone, reminderMinutes });

    res.setHeader("Content-Type", "text/calendar");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${event.name.replace(/[^a-z0-9]/gi, "_")}.ics"`
    );

    res.send(icsContent);
  } catch (err) {
    res.status(500).json({ message: "Failed to generate calendar file" });
  }
};

// GET CALENDAR LINKS (Google/Outlook)
exports.getCalendarLinks = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event || event.status !== "PUBLISHED") {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({
      google: generateGoogleCalendarUrl(event),
      outlook: generateOutlookCalendarUrl(event),
      ics: `/api/events/${event._id}/calendar`
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate calendar links" });
  }
};

// GET EVENT ANALYTICS (ORGANIZER ONLY)
exports.getEventAnalytics = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.organizer.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not your event" });
    }

    const registrations = await Registration.countDocuments({
      event: event._id,
      status: "REGISTERED"
    });

    const attendance = await Attendance.countDocuments({
      event: event._id
    });

    const revenue = registrations * (event.registrationFee || 0);

    let teamStats = null;
    if (event.type === "NORMAL" && event.isTeamEvent && event.teamSize && Number(event.teamSize) >= 2) {
      const regs = await Registration.find({ event: event._id, status: "REGISTERED" })
        .select("teamCode");

      const counts = new Map();
      regs.forEach(r => {
        const code = (r.teamCode || "").trim();
        if (!code) return;
        counts.set(code, (counts.get(code) || 0) + 1);
      });

      const teamsTotal = counts.size;
      const teamsCompleted = Array.from(counts.values()).filter(c => c >= Number(event.teamSize)).length;
      const teamCompletionRate = teamsTotal > 0 ? ((teamsCompleted / teamsTotal) * 100).toFixed(2) : 0;

      teamStats = {
        teamsTotal,
        teamsCompleted,
        teamSize: Number(event.teamSize),
        teamCompletionRate
      };
    }

    res.json({
      registrations,
      attendance,
      revenue,
      attendanceRate: registrations > 0 ? ((attendance / registrations) * 100).toFixed(2) : 0,
      teamStats
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
};

// GET EVENT PARTICIPANTS (ORGANIZER ONLY)
exports.getEventParticipants = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.organizer.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not your event" });
    }

    const registrations = await Registration.find({
      event: event._id,
      status: "REGISTERED"
    })
      .populate("participant", "firstName lastName email contactNumber")
      .sort({ createdAt: -1 });

    const tickets = await Ticket.find({ event: event._id })
      .populate("participant", "firstName lastName email");

    const attendanceRecords = await Attendance.find({ event: event._id })
      .populate({
        path: "ticket",
        populate: {
          path: "participant",
          select: "firstName lastName email"
        }
      });

    const attendanceMap = new Map();
    attendanceRecords.forEach(record => {
      if (record.ticket && record.ticket.participant) {
        attendanceMap.set(record.ticket.participant._id.toString(), true);
      }
    });

    const participants = registrations.map(reg => {
      const ticket = tickets.find(t => t.participant._id.toString() === reg.participant._id.toString());
      const hasAttended = attendanceMap.has(reg.participant._id.toString());

      return {
        _id: reg._id,
        participant: reg.participant,
        registrationDate: reg.createdAt,
        paymentStatus: ticket ? "PAID" : "PENDING",
        paymentAmount: event.registrationFee || 0,
        attendance: hasAttended ? "PRESENT" : "ABSENT",
        ticketId: ticket ? ticket.ticketId : null,
        teamCode: reg.teamCode || null
      };
    });

    res.json(participants);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch participants" });
  }
};

// UPDATE EVENT (WITH STATUS-BASED RULES)
exports.updateEventWithRules = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.organizer.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not your event" });
    }

    const { action, ...updates } = req.body;

    // Check if event has registrations (for form locking)
    const hasRegistrations = await Registration.exists({ event: event._id });

    // Status-based editing rules
    if (event.status === "DRAFT") {
      // Free edits, can publish
      Object.assign(event, updates);
      if (action === "publish") {
        event.status = "PUBLISHED";
        // Auto-post to Discord if webhook is configured
        try {
          const organizer = await Organizer.findById(event.organizer);
          if (organizer && organizer.discordWebhookUrl) {
            await postToDiscord(organizer.discordWebhookUrl, event);
          }
        } catch (discordErr) {
          console.error("Discord post failed:", discordErr.message);
        }
      }
    } else if (event.status === "PUBLISHED") {
      // Limited edits: description, extend deadline, increase limit, close registrations
      const allowedFields = ["description", "registrationDeadline", "registrationLimit", "status"];
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          event[key] = updates[key];
        }
      });
      if (action === "close") {
        event.status = "CLOSED";
      }
    } else if (event.status === "ONGOING" || event.status === "COMPLETED") {
      // Only status change allowed
      if (updates.status && ["COMPLETED", "CLOSED"].includes(updates.status)) {
        event.status = updates.status;
      } else {
        return res.status(400).json({ message: "Only status change allowed for ongoing/completed events" });
      }
    }

    // Lock form if registrations exist
    if (hasRegistrations && updates.registrationForm) {
      return res.status(400).json({ message: "Cannot modify form after first registration" });
    }

    await event.save();
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: "Failed to update event" });
  }
};
