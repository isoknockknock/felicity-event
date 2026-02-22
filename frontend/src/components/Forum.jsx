import { useEffect, useState, useContext, useRef } from "react";
import { io } from "socket.io-client";
import API from "../services/api";
import { AuthContext } from "../context/AuthContext";

const socket = io("http://localhost:5000");

const EMOJI_OPTIONS = ["👍", "❤️", "🎉", "😂", "🔥", "👏"];

export default function Forum({ eventId }) {
  const { role, token } = useContext(AuthContext);
  const userId = token ? JSON.parse(atob(token.split(".")[1])).userId : null;

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
      <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.3rem", flexWrap: "wrap" }}>
        {Object.entries(grouped).map(([emoji, users]) => (
          <button
            key={emoji}
            onClick={() => handleReact(msg._id, emoji)}
            style={{
              background: users.includes(userId) ? "#dbeafe" : "#f3f4f6",
              border: users.includes(userId) ? "1px solid #3b82f6" : "1px solid #d1d5db",
              borderRadius: "12px",
              padding: "0.1rem 0.5rem",
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
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
      style={{
        background: msg.isAnnouncement
          ? "#fef3c7"
          : msg.isPinned
            ? "#ede9fe"
            : isThreadReply
              ? "#f9fafb"
              : "#f3f4f6",
        padding: "0.6rem 0.8rem",
        borderRadius: "8px",
        marginBottom: "0.5rem",
        marginLeft: isThreadReply ? "1.5rem" : 0,
        borderLeft: msg.isPinned ? "3px solid #8b5cf6" : msg.isAnnouncement ? "3px solid #f59e0b" : "none",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: "0.85rem" }}>
          {msg.senderName || msg.senderRole}
          {msg.isAnnouncement && " 📢"}
          {msg.isPinned && " 📌"}
        </strong>
        <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
            {new Date(msg.createdAt).toLocaleTimeString()}
          </span>

          {/* Emoji react button */}
          <button
            onClick={() => setShowEmojiFor(showEmojiFor === msg._id ? null : msg._id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "0.8rem",
              padding: "0 0.2rem",
            }}
            title="React"
          >
            😊
          </button>

          {/* Reply button (top-level only) */}
          {!isThreadReply && (
            <button
              onClick={() => {
                setReplyTo(msg._id);
                loadThread(msg._id);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "0.75rem",
                color: "#2563eb",
              }}
            >
              Reply
            </button>
          )}

          {/* Organizer moderation */}
          {role === "ORGANIZER" && (
            <>
              <button
                onClick={() => handlePin(msg._id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  color: "#8b5cf6",
                }}
                title={msg.isPinned ? "Unpin" : "Pin"}
              >
                {msg.isPinned ? "Unpin" : "Pin"}
              </button>
              <button
                onClick={() => handleDelete(msg._id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  color: "#ef4444",
                }}
                title="Delete"
              >
                ✕
              </button>
            </>
          )}
        </div>
      </div>

      {/* Emoji picker */}
      {showEmojiFor === msg._id && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "0.4rem",
            display: "flex",
            gap: "0.3rem",
            zIndex: 10,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReact(msg._id, emoji)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "1.2rem",
                padding: "0.1rem",
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <p style={{ marginTop: "0.3rem", marginBottom: "0.2rem" }}>{msg.content}</p>

      {renderReactions(msg)}

      {/* Thread indicator */}
      {!isThreadReply && replyCount(msg._id) > 0 && (
        <button
          onClick={() => loadThread(msg._id)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "0.75rem",
            color: "#2563eb",
            marginTop: "0.3rem",
            padding: 0,
          }}
        >
          💬 {replyCount(msg._id)} {replyCount(msg._id) === 1 ? "reply" : "replies"}
        </button>
      )}
    </div>
  );

  return (
    <div>
      {/* Notification */}
      {notification && (
        <div
          style={{
            background: "#dbeafe",
            color: "#1e40af",
            padding: "0.5rem 0.8rem",
            borderRadius: "6px",
            marginBottom: "0.5rem",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          🔔 {notification}
        </div>
      )}

      {/* Pinned Messages */}
      {pinnedMessages.length > 0 && (
        <div style={{ marginBottom: "0.75rem" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#8b5cf6", marginBottom: "0.3rem" }}>
            📌 Pinned Messages
          </div>
          {pinnedMessages.map((msg) => renderMessage(msg))}
        </div>
      )}

      {/* Messages List */}
      <div
        style={{
          maxHeight: "350px",
          overflowY: "auto",
          marginBottom: "1rem",
          paddingRight: "0.5rem",
        }}
      >
        {topLevelMessages.length === 0 && (
          <p style={{ color: "#9ca3af" }}>No messages yet.</p>
        )}

        {topLevelMessages.map((msg) => (
          <div key={msg._id}>
            {renderMessage(msg)}

            {/* Thread view */}
            {threadView === msg._id && (
              <div style={{ marginLeft: "1.5rem", borderLeft: "2px solid #e5e7eb", paddingLeft: "0.5rem" }}>
                {threadReplies.length === 0 && (
                  <p style={{ color: "#9ca3af", fontSize: "0.8rem" }}>No replies yet.</p>
                )}
                {threadReplies.map((reply) => renderMessage(reply, true))}
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div
          style={{
            background: "#f0f9ff",
            padding: "0.4rem 0.8rem",
            borderRadius: "6px",
            marginBottom: "0.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.85rem",
          }}
        >
          <span>
            Replying to thread...
          </span>
          <button
            onClick={() => {
              setReplyTo(null);
              setThreadView(null);
              setThreadReplies([]);
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#ef4444",
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Input */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          placeholder={replyTo ? "Write a reply..." : "Write a message..."}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          style={{ flex: 1 }}
        />
        <button className="primary" onClick={sendMessage}>
          {replyTo ? "Reply" : "Send"}
        </button>
        {role === "ORGANIZER" && !replyTo && (
          <button
            onClick={sendAnnouncement}
            style={{
              background: "#f59e0b",
              color: "white",
              border: "none",
              borderRadius: "6px",
              padding: "0.5rem 1rem",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            📢 Announce
          </button>
        )}
      </div>
    </div>
  );
}
