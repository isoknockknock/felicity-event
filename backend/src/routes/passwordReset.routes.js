const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");

const {
  requestReset,
  getRequests,
  approveReset,
  rejectReset
} = require("../controllers/passwordReset.controller");

// ORGANIZER
router.post(
  "/request",
  auth,
  requireRole("ORGANIZER"),
  requestReset
);

// ADMIN
router.get(
  "/",
  auth,
  requireRole("ADMIN"),
  getRequests
);

router.post(
  "/:id/approve",
  auth,
  requireRole("ADMIN"),
  approveReset
);

router.post(
  "/:id/reject",
  auth,
  requireRole("ADMIN"),
  rejectReset
);

module.exports = router;
