const MerchandiseOrder = require("../models/MerchandiseOrder.model");
const Event = require("../models/Event.model");
const Ticket = require("../models/Ticket.model");
const crypto = require("crypto");
const Participant = require("../models/Participant.model");
const { sendTicketEmail } = require("../utils/ticketEmail");

// PARTICIPANT: PLACE ORDER (creates order in CREATED state, NO stock decrement yet)
exports.createOrder = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);

    if (!event || event.type !== "MERCHANDISE") {
      return res.status(400).json({ message: "Invalid merchandise event" });
    }

    if (event.status !== "PUBLISHED") {
      return res.status(400).json({ message: "Event not open for orders" });
    }

    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      return res.status(400).json({ message: "Registration deadline passed" });
    }

    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (items.length === 0) {
      return res.status(400).json({ message: "No items selected" });
    }

    // Validate items, stock, and purchase limits
    for (const item of items) {
      const merch = event.merchandiseItems.find(m => m.name === item.name);
      if (!merch) {
        return res.status(400).json({ message: `Item not found: ${item.name}` });
      }
      const qty = Number(item.quantity || 0);
      if (qty <= 0) {
        return res.status(400).json({ message: "Invalid quantity" });
      }
      if (merch.stock < qty) {
        return res.status(400).json({ message: `Out of stock: ${item.name}` });
      }

      // Check per-participant purchase limit
      const limit = merch.purchaseLimitPerParticipant || 1;
      if (qty > limit) {
        return res.status(400).json({
          message: `Purchase limit exceeded for ${item.name}. Maximum ${limit} per participant.`
        });
      }

      // Check existing purchases by this participant
      const existingOrders = await MerchandiseOrder.find({
        participant: req.user.userId,
        event: event._id,
        status: { $in: ["APPROVED", "PENDING", "CREATED"] }
      });

      const totalPurchased = existingOrders.reduce((sum, order) => {
        const itemOrder = order.items.find(i => i.name === item.name);
        return sum + (itemOrder ? Number(itemOrder.quantity) : 0);
      }, 0);

      if (totalPurchased + qty > limit) {
        return res.status(400).json({
          message: `Purchase limit exceeded for ${item.name}. You have already ordered ${totalPurchased} out of ${limit} allowed.`
        });
      }
    }

    // Build priced items (but do NOT decrement stock yet)
    const pricedItems = items.map(item => {
      const merch = event.merchandiseItems.find(m => m.name === item.name);
      const pricedItem = {
        name: merch.name,
        quantity: Number(item.quantity),
        price: Number(merch.price || 0)
      };
      if (item.size) pricedItem.size = item.size;
      if (item.color) pricedItem.color = item.color;
      return pricedItem;
    });

    const order = await MerchandiseOrder.create({
      participant: req.user.userId,
      event: event._id,
      items: pricedItems,
      status: "CREATED"
    });

    res.status(201).json({
      message: "Order placed. Please upload payment proof to proceed.",
      orderId: order._id
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to create order" });
  }
};

// PARTICIPANT: UPLOAD PAYMENT PROOF (image file)
exports.uploadPaymentProof = async (req, res) => {
  try {
    const order = await MerchandiseOrder.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.participant.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (order.status !== "CREATED" && order.status !== "REJECTED") {
      return res.status(400).json({ message: "Cannot upload proof for this order status" });
    }

    // If a file was uploaded via multer
    if (req.file) {
      order.paymentProof = `/uploads/${req.file.filename}`;
    } else if (req.body.paymentProof) {
      // Fallback: accept a URL or base64 string
      order.paymentProof = req.body.paymentProof;
    } else {
      return res.status(400).json({ message: "No payment proof provided" });
    }

    order.status = "PENDING";
    await order.save();

    res.json({ message: "Payment proof uploaded. Awaiting organizer approval.", order });
  } catch (err) {
    res.status(500).json({ message: "Upload failed" });
  }
};

// PARTICIPANT: GET MY ORDERS
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await MerchandiseOrder.find({
      participant: req.user.userId
    })
      .populate("event", "name type status")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

// ORGANIZER: VIEW ORDERS FOR EVENT
exports.getOrdersForEvent = async (req, res) => {
  try {
    const orders = await MerchandiseOrder.find({ event: req.params.eventId })
      .populate("participant", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

// ORGANIZER: APPROVE ORDER
exports.approveOrder = async (req, res) => {
  try {
    const order = await MerchandiseOrder.findById(req.params.orderId)
      .populate("event");

    if (!order || order.status !== "PENDING") {
      return res.status(400).json({ message: "Invalid order state. Order must be in PENDING status." });
    }

    // Verify organizer owns the event
    if (order.event.organizer.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized for this event" });
    }

    // Decrement stock on approval
    for (const item of order.items) {
      const merch = order.event.merchandiseItems.find(
        m => m.name === item.name
      );
      if (!merch || merch.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${item.name}` });
      }
      merch.stock -= item.quantity;
    }

    order.status = "APPROVED";
    await order.event.save();
    await order.save();

    // Generate ticket with QR
    const ticket = await Ticket.create({
      ticketId: crypto.randomUUID(),
      participant: order.participant,
      event: order.event._id
    });

    // Send confirmation email
    try {
      const participant = await Participant.findById(order.participant).select("firstName lastName email");
      const emailResult = await sendTicketEmail({
        to: participant.email,
        participantName: `${participant.firstName} ${participant.lastName}`,
        event: order.event,
        ticketId: ticket.ticketId
      });
      console.log("Merch approval email result:", { mode: emailResult.mode, previewUrl: emailResult.previewUrl });
    } catch (emailErr) {
      console.log("Merch approval email failed:", emailErr?.message || emailErr);
    }

    res.json({
      message: "Order approved, ticket generated, and confirmation email sent",
      ticketId: ticket.ticketId
    });
  } catch (err) {
    res.status(500).json({ message: "Approval failed" });
  }
};

// ORGANIZER: REJECT ORDER
exports.rejectOrder = async (req, res) => {
  try {
    const order = await MerchandiseOrder.findById(req.params.orderId)
      .populate("event");

    if (!order || order.status !== "PENDING") {
      return res.status(400).json({ message: "Invalid order state" });
    }

    // Verify organizer owns the event
    if (order.event.organizer.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized for this event" });
    }

    order.status = "REJECTED";
    await order.save();

    res.json({ message: "Order rejected" });
  } catch (err) {
    res.status(500).json({ message: "Rejection failed" });
  }
};
