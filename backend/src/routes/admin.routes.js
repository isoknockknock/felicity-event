const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");
const { getAdminProfile } = require("../controllers/admin.controller");


const {
  createOrganizer,
  disableOrganizer,
  archiveOrganizer,
  deleteOrganizer,
  getOrganizers
} = require("../controllers/admin.controller");

router.use(authMiddleware);
router.use(requireRole("ADMIN"));

router.get("/organizers", getOrganizers);
router.post("/organizers", createOrganizer);
router.delete("/organizers/:id", disableOrganizer);
router.post("/organizers/:id/archive", archiveOrganizer);
router.delete("/organizers/:id/permanent", deleteOrganizer);

router.get(
  "/me",
  authMiddleware,
  requireRole("ADMIN"),
  getAdminProfile
);

module.exports = router;

