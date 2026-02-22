import { useEffect, useState, useContext, useRef, useMemo } from "react";
import { io } from "socket.io-client";
import API from "../services/api";
import { AuthContext } from "../context/AuthContext";
import "./Forum.css";

const socket = io("http://localhost:5000");

const EMOJI_OPTIONS = ["👍", "❤️", "🎉", "😂", "🔥", "👏"];

export default function Forum({ eventId }) {
  const { role, token } = useContext(AuthContext);
  const userId = useMemo(() => {
    try {
      if (!token) return null;
      const parts = token.split(".");
      if (parts.length < 2) return null;
      return JSON.parse(atob(parts[1])).userId;
    } catch {
      return null;
    }
  }, [token]);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [threadView, setThreadView] = useState(null);
  const [threadReplies, setThreadReplies] = useState([]);
  const [showEmojiFor, setShowEmojiFor] = useState(null);
  const [notification, setNotification] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    API.get(`/forum/${eventId}`)
      .then((res) => setMessages(res.data))
      .catch(() => { });

    socket.emit("join_event", eventId);

    socket.on("receive_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (msg.senderId !== userId) {
        setNotification(`New message from ${msg.senderName || msg.senderRole}`);
        setTimeout(() => setNotification(""), 3000);
      }
    });

    socket.on("message_deleted", ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
      if (threadView === messageId) {
        setThreadView(null);
        setThreadReplies([]);
      }
    });

    socket.on("message_pinned", ({ messageId, isPinned }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, isPinned } : m))
      );
    });

    return () => {
      socket.off("receive_message");
      socket.off("message_deleted");
      socket.off("message_pinned");
      socket.emit("leave_event", eventId);
    };
  }, [eventId, userId, threadView]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadThread = async (messageId) => {
    try {
      const res = await API.get(`/forum/${messageId}/replies`);
      setThreadReplies(res.data);
      setThreadView(messageId);
    } catch {
      setThreadReplies([]);
    }
  };

  const sendMessage = () => {
    if (!text.trim()) return;

    socket.emit("send_message", {
      eventId,
      senderId: userId,
      senderRole: role,
      content: text,
      isAnnouncement: false,
      parentMessage: replyTo || null,
    });

    setText("");
    setReplyTo(null);
  };

  const sendAnnouncement = () => {
    if (!text.trim() || role !== "ORGANIZER") return;

    socket.emit("send_message", {
      eventId,
      senderId: userId,
      senderRole: role,
      content: text,
      isAnnouncement: true,
      parentMessage: null,
    });

    setText("");
  };

  const handleDelete = (messageId) => {
    socket.emit("delete_message", { messageId, eventId });
  };

  const handlePin = (messageId) => {
    socket.emit("pin_message", { messageId, eventId });
  };

  const handleReact = async (messageId, emoji) => {
    try {
      const res = await API.post(`/forum/${messageId}/react`, { emoji });
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? res.data.data : m))
      );
      setShowEmojiFor(null);
    } catch {
      console.error("Failed to react");
    }
  };

  const pinnedMessages = messages.filter((m) => m.isPinned && !m.parentMessage);
  const topLevelMessages = messages.filter((m) => !m.parentMessage);

  const replyCount = (msgId) =>
    messages.filter((m) => m.parentMessage === msgId).length;

  const renderReactions = (msg) => {
    if (!msg.reactions || msg.reactions.length === 0) return null;

    const grouped = {};
    msg.reactions.forEach((r) => {
      if (!grouped[r.emoji]) grouped[r.emoji] = [];
      grouped[r.emoji].push(r.userId);
    });

    return (
      <div className="reactions-list">
        {Object.entries(grouped).map(([emoji, users]) => (
          <button
            key={emoji}
            className={`reaction-btn ${users.includes(userId) ? "active" : ""}`}
            onClick={() => handleReact(msg._id, emoji)}
          >
            {emoji} {users.length}
          </button>
        ))}
      </div>
    );
  };

  const renderMessage = (msg, isThreadReply = false) => (
    <div
      key={msg._id}
      className={`message-item ${msg.isAnnouncement ? "announcement" : ""} ${msg.isPinned ? "pinned" : ""} ${isThreadReply ? "reply" : ""}`}
    >
      <div className="message-header">
        <strong className="sender-name">
          {msg.senderName || msg.senderRole}
          {msg.isAnnouncement && " 📢"}
          {msg.isPinned && " 📌"}
        </strong>
        <div className="message-actions">
          <span className="message-time">
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>

          <button
            className="action-icon-btn"
            onClick={() => setShowEmojiFor(showEmojiFor === msg._id ? null : msg._id)}
            title="React"
          >
            😊
          </button>

          {!isThreadReply && (
            <button
              className="action-icon-btn"
              onClick={() => {
                setReplyTo(msg._id);
                loadThread(msg._id);
              }}
            >
              Reply
            </button>
          )}

          {role === "ORGANIZER" && (
            <>
              <button
                className="action-icon-btn"
                onClick={() => handlePin(msg._id)}
                title={msg.isPinned ? "Unpin" : "Pin"}
                style={{ color: "var(--accent-primary)" }}
              >
                {msg.isPinned ? "📍" : "📌"}
              </button>
              <button
                className="action-icon-btn"
                onClick={() => handleDelete(msg._id)}
                title="Delete"
                style={{ color: "var(--danger)" }}
              >
                ✕
              </button>
            </>
          )}
        </div>
      </div>

      {showEmojiFor === msg._id && (
        <div className="emoji-picker">
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              className="emoji-btn"
              onClick={() => handleReact(msg._id, emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <p className="message-content">{msg.content}</p>

      {renderReactions(msg)}

      {!isThreadReply && replyCount(msg._id) > 0 && (
        <button className="thread-link" onClick={() => loadThread(msg._id)}>
          💬 {replyCount(msg._id)} {replyCount(msg._id) === 1 ? "reply" : "replies"}
        </button>
      )}
    </div>
  );

  return (
    <div className="forum-container">
      {notification && (
        <div className="forum-notification">
          🔔 {notification}
        </div>
      )}

      {pinnedMessages.length > 0 && (
        <div className="pinned-section">
          <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--accent-primary)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
            📌 Pinned Announcements
          </div>
          {pinnedMessages.map((msg) => renderMessage(msg))}
        </div>
      )}

      <div className="messages-list">
        {topLevelMessages.length === 0 && (
          <p className="p-muted" style={{ textAlign: "center", padding: "2rem" }}>No messages yet. Start the conversation!</p>
        )}

        {topLevelMessages.map((msg) => (
          <div key={msg._id}>
            {renderMessage(msg)}

            {threadView === msg._id && (
              <div className="thread-replies">
                {threadReplies.length === 0 && (
                  <p className="p-muted" style={{ fontSize: "0.8rem", marginLeft: "2rem" }}>No replies yet.</p>
                )}
                {threadReplies.map((reply) => renderMessage(reply, true))}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {replyTo && (
        <div className="reply-context">
          <span>Replying to {messages.find(m => m._id === replyTo)?.senderName || "message"}...</span>
          <button
            className="action-icon-btn"
            onClick={() => {
              setReplyTo(null);
              setThreadView(null);
              setThreadReplies([]);
            }}
            style={{ color: "var(--danger)", fontWeight: 700 }}
          >
            Cancel
          </button>
        </div>
      )}

      <div className="forum-input-area">
        <div style={{ flex: 1 }}>
          <textarea
            placeholder={replyTo ? "Write a reply..." : "Talk to the community..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            style={{ marginBottom: 0, minHeight: "45px", paddingTop: "0.75rem" }}
          />
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="primary" onClick={sendMessage}>
            {replyTo ? "Reply" : "Send"}
          </button>
          {role === "ORGANIZER" && !replyTo && (
            <button
              onClick={sendAnnouncement}
              className="secondary"
              title="Post as Announcement"
              style={{ padding: "0.75rem" }}
            >
              📢
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
