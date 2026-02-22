const { io } = require("socket.io-client");

const socket = io("http://localhost:5000");

socket.on("connect", () => {
  console.log("Connected");

  socket.emit("join_event", "698895802243dd11da03cf34");

  socket.emit("send_message", {
    eventId: "698895802243dd11da03cf34",
    senderId: "69872050ba04aaccdc5a1363",
    senderRole: "PARTICIPANT",
    content: "Testing from Node script",
    isAnnouncement: false
  });
});

socket.on("receive_message", (msg) => {
  console.log("Received:", msg);
});
