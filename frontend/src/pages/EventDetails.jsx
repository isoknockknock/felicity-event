import { useEffect, useMemo, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import API from "../services/api";
import { AuthContext } from "../context/AuthContext";
import Forum from "../components/Forum";
import "./EventDetails.css";

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
          const m = (event.merchandiseItems || []).find(item => item.name === name);
          const limit = m?.purchaseLimitPerParticipant || 1;
          const qty = typeof data === "object" ? Number(data.quantity || 0) : Number(data || 0);

          if (qty <= 0) return null;

          const maxAllowed = Math.min(m?.stock || 0, limit);
          if (qty > maxAllowed) {
            throw new Error(`Quantity for ${name} exceeds available stock or limit.`);
          }

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

  const [calendarLinks, setCalendarLinks] = useState(null);
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const reminderMinutes = [1440, 60];

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

  const handleCalendarDownload = () => {
    const params = new URLSearchParams({
      timezone: timezone,
      reminders: reminderMinutes.join(","),
    });
    window.open(`http://localhost:5000/api/events/${id}/calendar?${params.toString()}`);
  };

  const hasSelectedMerch = useMemo(() => {
    return Object.values(purchaseItems).some((data) => {
      const qty = typeof data === "object" ? Number(data.quantity || 0) : Number(data || 0);
      return qty > 0;
    });
  }, [purchaseItems]);

  if (!event) return <div className="container p-muted">Gathering details...</div>;

  const now = Date.now();
  const deadlinePassed = event.registrationDeadline && new Date(event.registrationDeadline).getTime() < now;
  const limitReached = stats?.limitReached || false;

  const canRegisterNormal =
    role === "PARTICIPANT" &&
    event.type === "NORMAL" &&
    event.status === "PUBLISHED" &&
    !deadlinePassed &&
    !limitReached;

  const merchItems = event.type === "MERCHANDISE" ? event.merchandiseItems || [] : [];
  const registrationFormFields = event.registrationForm || [];

  return (
    <div className="container event-details-page">
      <div className="event-main-card premium-card">
        <div className="event-hero">
          <div className="event-category-badge">{event.type}</div>
          <h1>{event.name}</h1>
          <p className="event-organizer">by <span>{event.organizer?.name}</span></p>
        </div>

        <div className="event-info-grid">
          <div className="info-item">
            <span className="info-label">Eligibility</span>
            <span className="info-value">{event.eligibility}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Starts</span>
            <span className="info-value">{new Date(event.startDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Ends</span>
            <span className="info-value">{new Date(event.endDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Fee</span>
            <span className={`info-value ${event.registrationFee === 0 ? 'free' : ''}`}>
              {event.registrationFee === 0 ? "FREE" : `₹${event.registrationFee}`}
            </span>
          </div>
        </div>

        <div className="event-description">
          <h3>About this Event</h3>
          <p>{event.description}</p>
        </div>

        {event.tags?.length > 0 && (
          <div className="event-tags">
            {event.tags.map((tag) => <span key={tag} className="tag-pill">{tag}</span>)}
          </div>
        )}

        {/* Dynamic Registration Form */}
        {role === "PARTICIPANT" && event.type === "NORMAL" && registrationFormFields.length > 0 && (
          <div className="registration-form-section">
            <h3>Complete Registration</h3>
            <div className="form-fields">
              {registrationFormFields.map((field, idx) => (
                <div key={idx} className="form-group">
                  <label>
                    {field.label} {field.required && <span className="required">*</span>}
                  </label>
                  {field.type === "text" && (
                    <input type="text" onChange={(e) => setFormData({ ...formData, [field.label]: e.target.value })} required={field.required} />
                  )}
                  {field.type === "number" && (
                    <input type="number" onChange={(e) => setFormData({ ...formData, [field.label]: e.target.value })} required={field.required} />
                  )}
                  {field.type === "textarea" && (
                    <textarea rows="3" onChange={(e) => setFormData({ ...formData, [field.label]: e.target.value })} required={field.required}></textarea>
                  )}
                  {field.type === "dropdown" && (
                    <select onChange={(e) => setFormData({ ...formData, [field.label]: e.target.value })} required={field.required}>
                      <option value="">Select option</option>
                      {(Array.isArray(field.options) ? field.options : (field.options || "").toString().split(",").filter(Boolean)).map((opt) => (
                        <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                      ))}
                    </select>
                  )}
                  {field.type === "checkbox" && (
                    <div className="checkbox-wrap">
                      <input type="checkbox" onChange={(e) => setFormData({ ...formData, [field.label]: e.target.checked })} />
                      <span>Confirm</span>
                    </div>
                  )}
                  {field.type === "file" && (
                    <input type="file" onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setFormData({ ...formData, [field.label]: reader.result });
                        reader.readAsDataURL(file);
                      }
                    }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="event-actions">
          {role === "PARTICIPANT" && event.type === "NORMAL" && event.isTeamEvent && (
            <div className="input-group" style={{ maxWidth: "300px", marginBottom: 0 }}>
              <label>Team Access Code</label>
              <input
                placeholder="Ex: ALPHA-123"
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value)}
                style={{ marginBottom: 0 }}
              />
            </div>
          )}

          {role === "PARTICIPANT" && event.type === "NORMAL" && (
            <button className="primary lg" onClick={handleRegister} disabled={!canRegisterNormal || actionLoading}>
              {actionLoading ? "Processing..." : "Register Now"}
            </button>
          )}

          {role === "PARTICIPANT" && event.type === "MERCHANDISE" && (
            <button className="primary lg" onClick={handlePlaceOrder} disabled={actionLoading || !hasSelectedMerch}>
              {actionLoading ? "Placing Order..." : "Buy Merchandise"}
            </button>
          )}

          <div className="calendar-dropdown-wrap">
            <button className="secondary" onClick={() => setShowCalendarOptions(!showCalendarOptions)}>
              Add to Calendar
            </button>
            {showCalendarOptions && (
              <div className="calendar-menu">
                <button onClick={handleCalendarDownload}>Download .ics File</button>
                {calendarLinks?.google && <button onClick={() => window.open(calendarLinks.google, "_blank")}>Google Calendar</button>}
                {calendarLinks?.outlook && <button onClick={() => window.open(calendarLinks.outlook, "_blank")}>Outlook Calendar</button>}
              </div>
            )}
          </div>
        </div>

        {actionMsg && <div className="action-feedback">{actionMsg}</div>}
      </div>

      {/* Merchandise Section */}
      {role === "PARTICIPANT" && event.type === "MERCHANDISE" && merchItems.length > 0 && (
        <div className="merch-section premium-card">
          <h2>Select Items</h2>
          <div className="merch-grid">
            {merchItems.map((m) => {
              const limit = m.purchaseLimitPerParticipant || 1;
              const itemData = purchaseItems[m.name] || {};
              const currentQty = typeof itemData === "object" ? Number(itemData.quantity || 0) : Number(itemData || 0);
              const maxAllowed = Math.min(m.stock, limit);
              return (
                <div key={m.name} className="merch-card">
                  <h4>{m.name}</h4>
                  <p className="price">₹{m.price}</p>
                  <div className="stock-info">Stock: {m.stock} · Limit: {limit}</div>

                  {m.sizeOptions?.length > 0 && (
                    <select value={itemData.size || ""} onChange={(e) => setPurchaseItems({ ...purchaseItems, [m.name]: { ...itemData, size: e.target.value } })}>
                      <option value="">Size</option>
                      {m.sizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}

                  {m.colorOptions?.length > 0 && (
                    <select value={itemData.color || ""} onChange={(e) => setPurchaseItems({ ...purchaseItems, [m.name]: { ...itemData, color: e.target.value } })}>
                      <option value="">Color</option>
                      {m.colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )}

                  <input type="number" min="0" max={maxAllowed} value={currentQty}
                    onChange={(e) => setPurchaseItems({ ...purchaseItems, [m.name]: { ...itemData, quantity: Number(e.target.value) } })}
                    placeholder="Qty" disabled={m.stock <= 0} />

                  {m.stock <= 0 && <span className="out-of-stock">Sold Out</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Orders Section for Merchandise */}
      {role === "PARTICIPANT" && event.type === "MERCHANDISE" && myOrders.length > 0 && (
        <div className="orders-section premium-card">
          <h2>My Order History</h2>
          {myOrders.map((order) => (
            <div key={order._id} className="order-item">
              <div className="order-header">
                <span>Order #{order._id.slice(-6).toUpperCase()}</span>
                <span className={`status-pill ${order.status.toLowerCase()}`}>{order.status}</span>
              </div>
              <p className="order-details">{order.items.map(i => `${i.name} (${i.quantity})`).join(", ")}</p>

              {(order.status === "CREATED" || order.status === "REJECTED") && (
                <div className="payment-upload">
                  <label>Upload Payment Proof</label>
                  <input type="file" onChange={(e) => e.target.files[0] && handleUploadProof(order._id, e.target.files[0])} disabled={uploadingProof === order._id} />
                  {uploadingProof === order._id && <p>Uploading...</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="discussion-section premium-card">
        <h2>Community Discussion</h2>
        <Forum eventId={id} />
      </div>
    </div>
  );
}
