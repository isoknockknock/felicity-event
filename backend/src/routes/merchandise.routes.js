const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");
const upload = require("../utils/upload");
const merchCtrl = require("../controllers/merchandise.controller");

// PARTICIPANT: Place order (creates order in CREATED state)
router.post("/:eventId/order", auth, requireRole("PARTICIPANT"), merchCtrl.createOrder);

// PARTICIPANT: Upload payment proof (image)
router.post(
  "/orders/:orderId/payment-proof",
  auth,
  requireRole("PARTICIPANT"),
  upload.single("paymentProof"),
  merchCtrl.uploadPaymentProof
);

// PARTICIPANT: Get my orders
router.get("/my-orders", auth, requireRole("PARTICIPANT"), merchCtrl.getMyOrders);

// ORGANIZER: View orders for event
router.get("/:eventId/orders", auth, requireRole("ORGANIZER"), merchCtrl.getOrdersForEvent);

// ORGANIZER: Approve order
router.patch("/orders/:orderId/approve", auth, requireRole("ORGANIZER"), merchCtrl.approveOrder);

// ORGANIZER: Reject order
router.patch("/orders/:orderId/reject", auth, requireRole("ORGANIZER"), merchCtrl.rejectOrder);

module.exports = router;
