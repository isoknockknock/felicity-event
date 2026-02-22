require("dotenv").config();
const express = require("express");
const path = require("path");
const connectDB = require("./config/db");
const seedAdmin = require("./config/seedAdmin");

const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const eventRoutes = require("./routes/event.routes");
const participantRoutes = require("./routes/participant.routes");
const merchandiseRoutes = require("./routes/merchandise.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const passwordResetRoutes = require("./routes/passwordReset.routes");
const organizerRoutes = require("./routes/organizer.routes");
const forumRoutes = require("./routes/forum.routes");

const cors = require("cors");

const app = express();

connectDB().then(seedAdmin);

app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://felicity-event-indol.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/participants", participantRoutes);
app.use("/api/merchandise", merchandiseRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/password-reset", passwordResetRoutes);
app.use("/api/organizers", organizerRoutes);
app.use("/api/forum", forumRoutes);

app.get("/", (req, res) => {
  res.send("Felicity EMS Backend is running");
});

const http = require("http");
const { Server } = require("socket.io");
const ForumMessage = require("./models/ForumMessage.model");
const Participant = require("./models/Participant.model");
const Organizer = require("./models/Organizer.model");

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// SOCKET LOGIC
io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("join_event", (eventId) => {
    socket.join(eventId);
  });

  socket.on("leave_event", (eventId) => {
    socket.leave(eventId);
  });

  socket.on("send_message", async (data) => {
    const { eventId, senderId, senderRole, content, isAnnouncement, parentMessage } = data;

    // Look up sender name
    let senderName = "";
    try {
      if (senderRole === "PARTICIPANT") {
        const p = await Participant.findById(senderId).select("firstName lastName");
        if (p) senderName = `${p.firstName} ${p.lastName}`;
      } else if (senderRole === "ORGANIZER") {
        const o = await Organizer.findById(senderId).select("name");
        if (o) senderName = o.name;
      }
    } catch (err) {
      console.error("Failed to look up sender name:", err.message);
    }

    const message = await ForumMessage.create({
      event: eventId,
      senderId,
      senderRole,
      senderName,
      content,
      isAnnouncement: isAnnouncement || false,
      parentMessage: parentMessage || null
    });

    io.to(eventId).emit("receive_message", message);
  });

  socket.on("delete_message", async (data) => {
    const { messageId, eventId } = data;
    try {
      await ForumMessage.findByIdAndDelete(messageId);
      // Also delete thread replies
      await ForumMessage.deleteMany({ parentMessage: messageId });
      io.to(eventId).emit("message_deleted", { messageId });
    } catch (err) {
      console.error("Failed to delete message via socket:", err.message);
    }
  });

  socket.on("pin_message", async (data) => {
    const { messageId, eventId } = data;
    try {
      const msg = await ForumMessage.findById(messageId);
      if (msg) {
        msg.isPinned = !msg.isPinned;
        await msg.save();
        io.to(eventId).emit("message_pinned", { messageId, isPinned: msg.isPinned });
      }
    } catch (err) {
      console.error("Failed to pin message via socket:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
