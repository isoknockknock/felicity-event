import { useEffect, useMemo, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import API from "../services/api";
import { AuthContext } from "../context/AuthContext";
import Forum from "../components/Forum";

export default function EventDetails() {
  const { id } = useParams();
  const { role } = useContext(AuthContext);

  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState(null);
  const [purchaseItems, setPurchaseItems] = useState({});
  const [actionMsg, setActionMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [teamCode, setTeamCode] = useState("");
  const [formData, setFormData] = useState({});
  const [myOrders, setMyOrders] = useState([]);
  const [uploadingProof, setUploadingProof] = useState(null);

  useEffect(() => {
    API.get(`/events/${id}`)
      .then((res) => setEvent(res.data))
      .catch(() => { });
    API.get(`/events/${id}/stats`)
      .then((res) => setStats(res.data))
      .catch(() => setStats(null));
  }, [id]);

  // Load participant's orders for this event (merchandise)
  useEffect(() => {
    if (role === "PARTICIPANT") {
      API.get("/merchandise/my-orders")
        .then((res) => {
          const eventOrders = (res.data || []).filter(
            (o) => o.event?._id === id || o.event === id
          );
          setMyOrders(eventOrders);
        })
        .catch(() => { });
    }
  }, [role, id]);

  const handleRegister = async () => {
    try {
      setActionLoading(true);
      setActionMsg("");
      const payload = {
        ...(event?.isTeamEvent ? { teamCode } : {}),
        formData: formData,
      };
      const res = await API.post(`/participants/events/${id}/register`, payload);
      setActionMsg(`Registered! Ticket ID: ${res.data.ticketId}`);
    } catch (err) {
      setActionMsg(err.response?.data?.message || "Registration failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    try {
      setActionLoading(true);
      setActionMsg("");
      const items = Object.entries(purchaseItems)
        .map(([name, data]) => {
          const qty = typeof data === "object" ? Number(data.quantity || 0) : Number(data || 0);
          if (qty <= 0) return null;
          const item = { name, quantity: qty };
          if (typeof data === "object") {
            if (data.size) item.size = data.size;
            if (data.color) item.color = data.color;
          }
          return item;
        })
        .filter((i) => i !== null);

      const res = await API.post(`/merchandise/${id}/order`, { items });
      setActionMsg(`Order placed! Order ID: ${res.data.orderId}. Please upload payment proof.`);
      setPurchaseItems({});
      // Refresh orders
      const ordersRes = await API.get("/merchandise/my-orders");
      const eventOrders = (ordersRes.data || []).filter(
        (o) => o.event?._id === id || o.event === id
      );
      setMyOrders(eventOrders);
      const st = await API.get(`/events/${id}/stats`).catch(() => null);
      if (st?.data) setStats(st.data);
    } catch (err) {
      setActionMsg(err.response?.data?.message || "Order failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadProof = async (orderId, file) => {
    try {
      setUploadingProof(orderId);
      const fd = new FormData();
      fd.append("paymentProof", file);
      await API.post(`/merchandise/orders/${orderId}/payment-proof`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setActionMsg("Payment proof uploaded! Awaiting organizer approval.");
      // Refresh orders
      const ordersRes = await API.get("/merchandise/my-orders");
      const eventOrders = (ordersRes.data || []).filter(
        (o) => o.event?._id === id || o.event === id
      );
      setMyOrders(eventOrders);
    } catch (err) {
      setActionMsg(err.response?.data?.message || "Upload failed");
    } finally {
      setUploadingProof(null);
    }
  };

  // Calendar
  const [calendarLinks, setCalendarLinks] = useState(null);
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [reminderMinutes, setReminderMinutes] = useState([1440, 60]);

  useEffect(() => {
    const loadCalendarLinks = async () => {
      try {
        const res = await API.get(`/events/${id}/calendar-links`);
        setCalendarLinks(res.data);
      } catch { }
    };
    if (event && event.status === "PUBLISHED") {
      loadCalendarLinks();
    }
  }, [id, event]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showCalendarOptions && !e.target.closest("[data-calendar-dropdown]")) {
        setShowCalendarOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCalendarOptions]);

  const handleCalendarDownload = () => {
    const params = new URLSearchParams({
      timezone: timezone,
      reminders: reminderMinutes.join(","),
    });
    window.open(`http://localhost:5000/api/events/${id}/calendar?${params.toString()}`);
  };

  const handleGoogleCalendar = () => {
    if (calendarLinks?.google) window.open(calendarLinks.google, "_blank");
  };

  const handleOutlookCalendar = () => {
    if (calendarLinks?.outlook) window.open(calendarLinks.outlook, "_blank");
  };

  const hasSelectedMerch = useMemo(() => {
    return Object.values(purchaseItems).some((data) => {
      const qty = typeof data === "object" ? Number(data.quantity || 0) : Number(data || 0);
      return qty > 0;
    });
  }, [purchaseItems]);

  if (!event) return <div className="container">Loading...</div>;

  const now = Date.now();
  const deadlinePassed =
    event.registrationDeadline && new Date(event.registrationDeadline).getTime() < now;
  const limitReached = stats?.limitReached || false;

  const canRegisterNormal =
    role === "PARTICIPANT" &&
    event.type === "NORMAL" &&
    event.status === "PUBLISHED" &&
    !deadlinePassed &&
    !limitReached;

  const merchItems = event.type === "MERCHANDISE" ? event.merchandiseItems || [] : [];
  const registrationFormFields = event.registrationForm || [];

  const getStatusBadge = (status) => {
    const colors = {
      CREATED: { bg: "#e5e7eb", text: "#374151" },
      PENDING: { bg: "#fef3c7", text: "#b45309" },
      APPROVED: { bg: "#d1fae5", text: "#065f46" },
      REJECTED: { bg: "#fee2e2", text: "#b91c1c" },
    };
    const c = colors[status] || colors.CREATED;
    return (
      <span style={{ background: c.bg, color: c.text, padding: "0.2rem 0.6rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600 }}>
        {status}
      </span>
    );
  };

  return (
    <div className="container">
      {/* Event Overview */}
      <div style={{ background: "white", padding: "2rem", borderRadius: "12px", boxShadow: "0 5px 15px rgba(0,0,0,0.06)", marginBottom: "2rem" }}>
        <h1>{event.name}</h1>
        <p style={{ margin: "1rem 0", color: "#4b5563" }}>{event.description}</p>
        <hr style={{ margin: "1.5rem 0" }} />
        <p><strong>Event Type:</strong> {event.type}</p>
        <p><strong>Eligibility:</strong> {event.eligibility}</p>
        <p><strong>Registration Deadline:</strong> {new Date(event.registrationDeadline).toLocaleString()}</p>
        <p><strong>Event Duration:</strong> {new Date(event.startDate).toLocaleString()} – {new Date(event.endDate).toLocaleString()}</p>
        <p><strong>Registration Limit:</strong> {event.registrationLimit || "Unlimited"}</p>
        <p><strong>Registration Fee:</strong> {event.registrationFee === 0 ? "Free" : `₹${event.registrationFee}`}</p>
        <p><strong>Club:</strong> {event.organizer?.name}</p>

        {stats && (
          <p>
            <strong>Current Registrations:</strong> {stats.registrationCount}
            {event.registrationLimit ? ` / ${event.registrationLimit}` : ""}
          </p>
        )}

        {event.tags?.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <strong>Tags:</strong>{" "}
            {event.tags.map((tag) => (
              <span key={tag} style={{ background: "#e5e7eb", padding: "0.25rem 0.6rem", borderRadius: "12px", fontSize: "0.8rem", marginRight: "0.4rem" }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Custom Registration Form (Normal Events) */}
        {role === "PARTICIPANT" && event.type === "NORMAL" && registrationFormFields.length > 0 && (
          <div style={{ marginTop: "1.5rem", background: "#f8fafc", padding: "1.2rem", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
            <h3 style={{ marginBottom: "1rem" }}>Registration Form</h3>
            {registrationFormFields.map((field, idx) => (
              <div key={idx} style={{ marginBottom: "0.8rem" }}>
                <label style={{ display: "block", fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.3rem" }}>
                  {field.label} {field.required && <span style={{ color: "#ef4444" }}>*</span>}
                </label>
                {field.type === "text" && (
                  <input
                    type="text"
                    value={formData[field.label] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.label]: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db", boxSizing: "border-box" }}
                    required={field.required}
                  />
                )}
                {field.type === "number" && (
                  <input
                    type="number"
                    value={formData[field.label] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.label]: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db", boxSizing: "border-box" }}
                    required={field.required}
                  />
                )}
                {field.type === "textarea" && (
                  <textarea
                    value={formData[field.label] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.label]: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db", boxSizing: "border-box" }}
                    rows="3"
                    required={field.required}
                  />
                )}
                {field.type === "dropdown" && (
                  <select
                    value={formData[field.label] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.label]: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
                    required={field.required}
                  >
                    <option value="">Select...</option>
                    {(field.options || []).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
                {field.type === "checkbox" && (
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                      type="checkbox"
                      checked={formData[field.label] === true}
                      onChange={(e) => setFormData({ ...formData, [field.label]: e.target.checked })}
                    />
                    Yes
                  </label>
                )}
                {field.type === "file" && (
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData({ ...formData, [field.label]: reader.result });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{ width: "100%", padding: "0.3rem" }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {role === "PARTICIPANT" && event.type === "NORMAL" && event.isTeamEvent && (
            <input
              placeholder="Team Code (required)"
              value={teamCode}
              onChange={(e) => setTeamCode(e.target.value)}
              style={{ padding: "0.6rem 0.8rem", borderRadius: 8, border: "1px solid #d1d5db", minWidth: 220 }}
            />
          )}
          {role === "PARTICIPANT" && event.type === "NORMAL" && (
            <button
              className="primary"
              onClick={handleRegister}
              disabled={!canRegisterNormal || actionLoading}
              title={
                event.status !== "PUBLISHED"
                  ? "Event not open"
                  : deadlinePassed
                    ? "Registration deadline passed"
                    : limitReached
                      ? "Registration limit reached"
                      : ""
              }
            >
              {actionLoading ? "Registering..." : "Register"}
            </button>
          )}

          {role === "PARTICIPANT" && event.type === "MERCHANDISE" && (
            <button
              className="primary"
              onClick={handlePlaceOrder}
              disabled={actionLoading || !hasSelectedMerch}
              title={!hasSelectedMerch ? "Select at least one item" : ""}
            >
              {actionLoading ? "Placing Order..." : "Place Order"}
            </button>
          )}

          <div style={{ position: "relative" }} data-calendar-dropdown>
            <button onClick={() => setShowCalendarOptions(!showCalendarOptions)}>
              Add to Calendar ▼
            </button>
            {showCalendarOptions && (
              <div data-calendar-dropdown style={{
                position: "absolute", top: "100%", left: 0, marginTop: "0.5rem",
                background: "white", border: "1px solid #e5e7eb", borderRadius: "8px",
                padding: "1rem", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 100, minWidth: "280px"
              }}>
                <div style={{ marginBottom: "0.75rem" }}>
                  <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85rem", fontWeight: 600 }}>Timezone:</label>
                  <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Asia/Kolkata">India Standard Time (IST)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Europe/Paris">Paris (CET)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                  </select>
                </div>
                <div style={{ marginBottom: "0.75rem" }}>
                  <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85rem", fontWeight: 600 }}>Reminders (minutes before):</label>
                  <input type="text" value={reminderMinutes.join(", ")}
                    onChange={(e) => {
                      const vals = e.target.value.split(",").map((v) => parseInt(v.trim())).filter((v) => !isNaN(v));
                      setReminderMinutes(vals.length > 0 ? vals : []);
                    }}
                    placeholder="e.g., 1440, 60"
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db", boxSizing: "border-box" }}
                  />
                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                    Separate with commas (e.g., 1440 = 1 day, 60 = 1 hour)
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <button onClick={handleCalendarDownload} style={{ padding: "0.5rem", background: "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.9rem" }}>
                    📥 Download ICS File
                  </button>
                  {calendarLinks?.google && (
                    <button onClick={handleGoogleCalendar} style={{ padding: "0.5rem", background: "#4285f4", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.9rem" }}>
                      📅 Add to Google Calendar
                    </button>
                  )}
                  {calendarLinks?.outlook && (
                    <button onClick={handleOutlookCalendar} style={{ padding: "0.5rem", background: "#0078d4", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.9rem" }}>
                      📅 Add to Outlook Calendar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {actionMsg && (
          <div style={{ marginTop: "1rem", color: "#111827" }}>
            <strong>{actionMsg}</strong>
            {actionMsg.includes("Ticket ID:") && (
              <>
                <br />
                <span style={{ color: "#2563eb" }}>You can view it in Participation History / Tickets.</span>
              </>
            )}
          </div>
        )}

        {/* Merchandise Items */}
        {role === "PARTICIPANT" && event.type === "MERCHANDISE" && merchItems.length > 0 && (
          <div style={{ marginTop: "1.5rem" }}>
            <h3>Merchandise</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
              {merchItems.map((m) => {
                const limit = m.purchaseLimitPerParticipant || 1;
                const itemData = purchaseItems[m.name] || {};
                const currentQty = typeof itemData === "object" ? Number(itemData.quantity || 0) : Number(itemData || 0);
                const currentSize = typeof itemData === "object" ? itemData.size || "" : "";
                const currentColor = typeof itemData === "object" ? itemData.color || "" : "";
                const maxAllowed = Math.min(m.stock, limit);
                return (
                  <div key={m.name} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "1rem", background: "#f9fafb" }}>
                    <div style={{ fontWeight: 700 }}>{m.name}</div>
                    <div style={{ color: "#6b7280", marginTop: 6 }}>Price: ₹{m.price || 0} · Stock: {m.stock}</div>
                    {limit > 1 && <div style={{ color: "#6b7280", fontSize: "0.85rem", marginTop: 4 }}>Max {limit} per participant</div>}
                    {m.sizeOptions?.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Size:</label>
                        <select value={currentSize}
                          onChange={(e) => setPurchaseItems({ ...purchaseItems, [m.name]: { ...(typeof purchaseItems[m.name] === "object" ? purchaseItems[m.name] : { quantity: purchaseItems[m.name] || 0 }), size: e.target.value } })}
                          style={{ width: "100%", marginTop: 4, padding: "0.4rem" }}>
                          <option value="">Select size</option>
                          {m.sizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
                        </select>
                      </div>
                    )}
                    {m.colorOptions?.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Color:</label>
                        <select value={currentColor}
                          onChange={(e) => setPurchaseItems({ ...purchaseItems, [m.name]: { ...(typeof purchaseItems[m.name] === "object" ? purchaseItems[m.name] : { quantity: purchaseItems[m.name] || 0 }), color: e.target.value } })}
                          style={{ width: "100%", marginTop: 4, padding: "0.4rem" }}>
                          <option value="">Select color</option>
                          {m.colorOptions.map((color) => <option key={color} value={color}>{color}</option>)}
                        </select>
                      </div>
                    )}
                    <div style={{ marginTop: 10 }}>
                      <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Quantity:</label>
                      <input type="number" min="0" max={maxAllowed} value={currentQty}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val <= maxAllowed) {
                            setPurchaseItems({ ...purchaseItems, [m.name]: { ...(typeof purchaseItems[m.name] === "object" ? purchaseItems[m.name] : {}), quantity: val, size: currentSize, color: currentColor } });
                          }
                        }}
                        style={{ marginTop: 4, width: "100%", padding: "0.4rem", boxSizing: "border-box" }}
                        disabled={m.stock <= 0}
                      />
                    </div>
                    {m.stock <= 0 && <div style={{ color: "#b91c1c", marginTop: 6, fontWeight: 600 }}>Out of stock</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* My Orders (Merchandise) — Payment Proof Upload */}
        {role === "PARTICIPANT" && event.type === "MERCHANDISE" && myOrders.length > 0 && (
          <div style={{ marginTop: "1.5rem" }}>
            <h3>My Orders</h3>
            {myOrders.map((order) => (
              <div key={order._id} style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1rem", marginBottom: "0.8rem", background: "#fafafa" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span>
                    <strong>Order:</strong> {order._id.slice(-8)}
                  </span>
                  {getStatusBadge(order.status)}
                </div>
                <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                  Items: {order.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}
                </div>
                {order.paymentProof && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <strong>Payment Proof:</strong>{" "}
                    <a href={`http://localhost:5000${order.paymentProof}`} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>
                      View Proof
                    </a>
                  </div>
                )}
                {(order.status === "CREATED" || order.status === "REJECTED") && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>
                      {order.status === "REJECTED" ? "Re-upload Payment Proof:" : "Upload Payment Proof:"}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) handleUploadProof(order._id, file);
                      }}
                      disabled={uploadingProof === order._id}
                    />
                    {uploadingProof === order._id && <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>Uploading...</span>}
                  </div>
                )}
                {order.status === "REJECTED" && (
                  <div style={{ color: "#b91c1c", fontSize: "0.85rem", marginTop: "0.3rem" }}>
                    Order was rejected. You may re-upload payment proof.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {(deadlinePassed || limitReached) && role === "PARTICIPANT" && event.type === "NORMAL" && (
          <div style={{ marginTop: "1rem", color: "#b91c1c", fontWeight: 600 }}>
            {deadlinePassed && "Registration deadline has passed. "}
            {limitReached && "Registration limit reached."}
          </div>
        )}
      </div>

      {/* Discussion */}
      <div style={{ background: "white", padding: "2rem", borderRadius: "12px", boxShadow: "0 5px 15px rgba(0,0,0,0.06)" }}>
        <h2>Discussion</h2>
        <Forum eventId={id} />
      </div>
    </div>
  );
}
