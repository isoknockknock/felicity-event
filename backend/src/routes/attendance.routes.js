const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");
const attendanceCtrl = require("../controllers/attendance.controller");

// SCAN QR / MARK ATTENDANCE
router.post("/scan", auth, requireRole("ORGANIZER"), attendanceCtrl.scanTicket);

// MANUAL OVERRIDE
router.post("/manual-override", auth, requireRole("ORGANIZER"), attendanceCtrl.manualOverride);

// GET ATTENDANCE LIST FOR EVENT
router.get("/:eventId", auth, requireRole("ORGANIZER"), attendanceCtrl.getAttendanceForEvent);

// LIVE ATTENDANCE DASHBOARD
router.get("/:eventId/dashboard", auth, requireRole("ORGANIZER"), attendanceCtrl.getAttendanceDashboard);

// EXPORT ATTENDANCE CSV
router.get("/:eventId/export", auth, requireRole("ORGANIZER"), attendanceCtrl.exportAttendanceCSV);

module.exports = router;
