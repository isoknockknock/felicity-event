const express = require("express");
const router = express.Router();

const {
  registerParticipant,
  login
} = require("../controllers/auth.controller");

router.post("/register/participant", registerParticipant);
router.post("/login", login);

module.exports = router;
