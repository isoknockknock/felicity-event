const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");

const {
  registerForEvent,
  getMyEvents,
  updateInterests,
  getParticipantProfile,
  updateParticipantProfile,
  followOrganizer,
  unfollowOrganizer,
  getMyTickets,
  getTicketByTicketId,
  getParticipationRecords,
  getMyUpcomingEvents,
  cancelRegistration,
  changeParticipantPassword,
  exportCalendarBatch
} = require("../controllers/participant.controller");

router.post(
  "/events/:eventId/register",
  auth,
  requireRole("PARTICIPANT"),
  registerForEvent
);

router.post(
  "/events/:eventId/cancel",
  auth,
  requireRole("PARTICIPANT"),
  cancelRegistration
);

router.get(
  "/me",
  auth,
  requireRole("PARTICIPANT"),
  getParticipantProfile
);

router.put(
  "/me",
  auth,
  requireRole("PARTICIPANT"),
  updateParticipantProfile
);


router.get(
  "/me/events",
  auth,
  requireRole("PARTICIPANT"),
  getMyEvents
);

router.get(
  "/me/upcoming",
  auth,
  requireRole("PARTICIPANT"),
  getMyUpcomingEvents
);

router.get(
  "/me/records",
  auth,
  requireRole("PARTICIPANT"),
  getParticipationRecords
);

router.get(
  "/me/tickets",
  auth,
  requireRole("PARTICIPANT"),
  getMyTickets
);

router.get(
  "/tickets/:ticketId",
  auth,
  requireRole("PARTICIPANT"),
  getTicketByTicketId
);

router.put(
  "/me/interests",
  auth,
  requireRole("PARTICIPANT"),
  updateInterests
);

router.post(
  "/clubs/:organizerId/follow",
  auth,
  requireRole("PARTICIPANT"),
  followOrganizer
);

router.post(
  "/clubs/:organizerId/unfollow",
  auth,
  requireRole("PARTICIPANT"),
  unfollowOrganizer
);

router.post(
  "/me/password",
  auth,
  requireRole("PARTICIPANT"),
  changeParticipantPassword
);

router.get(
  "/me/calendar/export",
  auth,
  requireRole("PARTICIPANT"),
  exportCalendarBatch
);

module.exports = router;
