const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");


const {
  createEvent,
  updateEvent,
  updateEventWithRules,
  publishEvent,
  getEvents,
  getTrendingEvents,
  getEventById,
  getEventPublicStats,
  getOrganizerEvents,
  getEventAnalytics,
  getEventParticipants
} = require("../controllers/event.controller");

const { addToCalendar, getCalendarLinks } = require("../controllers/event.controller");

// Organizer routes
router.post("/", auth, requireRole("ORGANIZER"), createEvent);
router.put("/:id", auth, requireRole("ORGANIZER"), updateEvent);
router.patch("/:id", auth, requireRole("ORGANIZER"), updateEventWithRules);
router.post("/:id/publish", auth, requireRole("ORGANIZER"), publishEvent);

router.get(
  "/organizer",
  auth,
  requireRole("ORGANIZER"),
  getOrganizerEvents
);

router.get(
  "/:id/analytics",
  auth,
  requireRole("ORGANIZER"),
  getEventAnalytics
);

router.get(
  "/:id/participants",
  auth,
  requireRole("ORGANIZER"),
  getEventParticipants
);

// Public routes
router.get("/trending", getTrendingEvents);
router.get("/", getEvents);
router.get("/:id", getEventById);
router.get("/:id/stats", getEventPublicStats);
router.get("/:id/calendar", addToCalendar);
router.get("/:id/calendar-links", getCalendarLinks);


module.exports = router;
