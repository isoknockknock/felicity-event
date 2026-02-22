import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../services/api";
import "./OrganizerEventDetails.css";

export default function OrganizerEventDetails() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeSection, setActiveSection] = useState("participants");
  const [actionMsg, setActionMsg] = useState("");

  const fetchEventData = useCallback(async () => {
    try {
      setLoading(true);
      const [eventRes, analyticsRes, participantsRes] = await Promise.all([
        API.get(`/events/${id}`),
        API.get(`/events/${id}/analytics`).catch(() => ({ data: null })),
        API.get(`/events/${id}/participants`).catch(() => ({ data: [] })),
      ]);

      setEvent(eventRes.data);
      setAnalytics(analyticsRes.data);
      setParticipants(participantsRes.data || []);

      // Load orders if merchandise event
      if (eventRes.data?.type === "MERCHANDISE") {
        const ordersRes = await API.get(`/merchandise/${id}/orders`).catch(() => ({ data: [] }));
        setOrders(ordersRes.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch event data", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  const handleApproveOrder = async (orderId) => {
    try {
      setActionMsg("");
      const res = await API.patch(`/merchandise/orders/${orderId}/approve`);
      setActionMsg(res.data.message);
      fetchEventData();
    } catch (err) {
      setActionMsg(err.response?.data?.message || "Approval failed");
    }
  };

  const handleRejectOrder = async (orderId) => {
    try {
      setActionMsg("");
      const res = await API.patch(`/merchandise/orders/${orderId}/reject`);
      setActionMsg(res.data.message);
      fetchEventData();
    } catch (err) {
      setActionMsg(err.response?.data?.message || "Rejection failed");
    }
  };

  const exportToCSV = () => {
    const filtered = getFilteredParticipants();
    const headers = ["Name", "Email", "Registration Date", "Payment Status", "Payment Amount", "Team", "Attendance", "Ticket ID"];
    const rows = filtered.map((p) => [
      `${p.participant.firstName} ${p.participant.lastName}`,
      p.participant.email,
      new Date(p.registrationDate).toLocaleString(),
      p.paymentStatus,
      `₹${p.paymentAmount}`,
      p.teamCode || "—",
      p.attendance,
      p.ticketId || "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.name}_participants.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getFilteredParticipants = () => {
    let filtered = participants;
    if (searchTerm) {
      filtered = filtered.filter((p) => {
        const name = `${p.participant.firstName} ${p.participant.lastName}`.toLowerCase();
        const email = p.participant.email.toLowerCase();
        return name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
      });
    }
    if (filterStatus !== "all") {
      filtered = filtered.filter((p) => {
        if (filterStatus === "paid") return p.paymentStatus === "PAID";
        if (filterStatus === "pending") return p.paymentStatus === "PENDING";
        if (filterStatus === "present") return p.attendance === "PRESENT";
        if (filterStatus === "absent") return p.attendance === "ABSENT";
        return true;
      });
    }
    return filtered;
  };

  if (loading) return <div className="organizer-event-details-container">Loading...</div>;
  if (!event) return <div className="organizer-event-details-container">Event not found</div>;

  const filteredParticipants = getFilteredParticipants();

  const pendingOrders = orders.filter((o) => o.status === "PENDING");
  const allOrders = orders;

  const getOrderStatusBadge = (status) => {
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
    <div className="organizer-event-details-container">
      <div className="details-header">
        <Link to="/organizer" className="back-link">← Back to Dashboard</Link>
        <div style={{ display: "flex", gap: "0.8rem" }}>
          <Link to={`/organizer/events/${id}/edit`} className="edit-link">Edit Event</Link>
          <Link to={`/organizer/events/${id}/scanner`} className="edit-link" style={{ background: "#059669" }}>
            📷 QR Scanner
          </Link>
        </div>
      </div>

      {/* Overview Section */}
      <div className="details-section">
        <h1>{event.name}</h1>
        <div className="overview-grid">
          <div className="overview-item">
            <span className="overview-label">Type:</span>
            <span>{event.type === "NORMAL" ? "Normal Event" : "Merchandise"}</span>
          </div>
          <div className="overview-item">
            <span className="overview-label">Status:</span>
            <span className={`status-badge status-${event.status.toLowerCase()}`}>{event.status}</span>
          </div>
          <div className="overview-item">
            <span className="overview-label">Eligibility:</span>
            <span>{event.eligibility || "All"}</span>
          </div>
          <div className="overview-item">
            <span className="overview-label">Registration Fee:</span>
            <span>{event.registrationFee === 0 ? "Free" : `₹${event.registrationFee}`}</span>
          </div>
          {event.registrationDeadline && (
            <div className="overview-item">
              <span className="overview-label">Registration Deadline:</span>
              <span>{new Date(event.registrationDeadline).toLocaleString()}</span>
            </div>
          )}
          {event.startDate && (
            <div className="overview-item">
              <span className="overview-label">Start Date:</span>
              <span>{new Date(event.startDate).toLocaleString()}</span>
            </div>
          )}
          {event.endDate && (
            <div className="overview-item">
              <span className="overview-label">End Date:</span>
              <span>{new Date(event.endDate).toLocaleString()}</span>
            </div>
          )}
          {event.registrationLimit && (
            <div className="overview-item">
              <span className="overview-label">Registration Limit:</span>
              <span>{event.registrationLimit}</span>
            </div>
          )}
        </div>
        {event.description && (
          <div className="description-box">
            <h3>Description</h3>
            <p>{event.description}</p>
          </div>
        )}
      </div>

      {/* Analytics Section */}
      {analytics && (
        <div className="details-section">
          <h2>Analytics</h2>
          <div className="analytics-grid">
            <div className="analytics-card">
              <div className="analytics-label">Registrations</div>
              <div className="analytics-value">{analytics.registrations}</div>
            </div>
            <div className="analytics-card">
              <div className="analytics-label">Attendance</div>
              <div className="analytics-value">{analytics.attendance}</div>
            </div>
            <div className="analytics-card">
              <div className="analytics-label">Revenue</div>
              <div className="analytics-value">₹{analytics.revenue}</div>
            </div>
            <div className="analytics-card">
              <div className="analytics-label">Attendance Rate</div>
              <div className="analytics-value">{analytics.attendanceRate}%</div>
            </div>
            {analytics.teamStats && (
              <div className="analytics-card">
                <div className="analytics-label">Team Completion</div>
                <div className="analytics-value">{analytics.teamStats.teamCompletionRate}%</div>
                <div style={{ color: "#6b7280", marginTop: 6, fontSize: "0.85rem" }}>
                  {analytics.teamStats.teamsCompleted}/{analytics.teamStats.teamsTotal} teams completed (size {analytics.teamStats.teamSize})
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section Tabs (for Merchandise events) */}
      {event.type === "MERCHANDISE" && (
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <button
            onClick={() => setActiveSection("participants")}
            style={{
              padding: "0.5rem 1rem", border: "none", borderRadius: "6px", cursor: "pointer",
              background: activeSection === "participants" ? "#2563eb" : "#e5e7eb",
              color: activeSection === "participants" ? "white" : "#374151",
              fontWeight: 600,
            }}
          >
            Participants
          </button>
          <button
            onClick={() => setActiveSection("orders")}
            style={{
              padding: "0.5rem 1rem", border: "none", borderRadius: "6px", cursor: "pointer",
              background: activeSection === "orders" ? "#2563eb" : "#e5e7eb",
              color: activeSection === "orders" ? "white" : "#374151",
              fontWeight: 600, position: "relative",
            }}
          >
            Orders {pendingOrders.length > 0 && (
              <span style={{
                background: "#ef4444", color: "white", borderRadius: "50%",
                padding: "0.1rem 0.4rem", fontSize: "0.7rem", marginLeft: "0.3rem",
              }}>
                {pendingOrders.length}
              </span>
            )}
          </button>
        </div>
      )}

      {actionMsg && (
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", padding: "0.8rem", borderRadius: "8px", marginBottom: "1rem", fontWeight: 600 }}>
          {actionMsg}
        </div>
      )}

      {/* Participants Section */}
      {activeSection === "participants" && (
        <div className="details-section">
          <div className="participants-header">
            <h2>Participants ({filteredParticipants.length})</h2>
            <div className="participants-controls">
              <input type="text" placeholder="Search by name or email..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending Payment</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </select>
              <button onClick={exportToCSV} className="export-btn">Export CSV</button>
            </div>
          </div>

          {filteredParticipants.length === 0 ? (
            <div className="no-participants">No participants found.</div>
          ) : (
            <div className="participants-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Registration Date</th>
                    <th>Payment</th>
                    <th>Amount</th>
                    <th>Team</th>
                    <th>Attendance</th>
                    <th>Ticket ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map((p) => (
                    <tr key={p._id}>
                      <td>{p.participant.firstName} {p.participant.lastName}</td>
                      <td>{p.participant.email}</td>
                      <td>{new Date(p.registrationDate).toLocaleString()}</td>
                      <td>
                        <span className={`payment-badge payment-${p.paymentStatus.toLowerCase()}`}>
                          {p.paymentStatus}
                        </span>
                      </td>
                      <td>₹{p.paymentAmount}</td>
                      <td>{p.teamCode || "—"}</td>
                      <td>
                        <span className={`attendance-badge attendance-${p.attendance.toLowerCase()}`}>
                          {p.attendance}
                        </span>
                      </td>
                      <td className="ticket-id">{p.ticketId || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Orders Section (Merchandise only) */}
      {activeSection === "orders" && event.type === "MERCHANDISE" && (
        <div className="details-section">
          <h2>Merchandise Orders ({allOrders.length})</h2>

          {allOrders.length === 0 ? (
            <div className="no-participants">No orders found.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              {allOrders.map((order) => (
                <div key={order._id} style={{
                  border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1rem",
                  background: order.status === "PENDING" ? "#fffbeb" : "#fafafa",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <div>
                      <strong>{order.participant?.firstName} {order.participant?.lastName}</strong>
                      <span style={{ color: "#6b7280", marginLeft: "0.5rem", fontSize: "0.85rem" }}>
                        {order.participant?.email}
                      </span>
                    </div>
                    {getOrderStatusBadge(order.status)}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "0.5rem" }}>
                    Items: {order.items.map((i) => `${i.name} × ${i.quantity} (₹${i.price})`).join(", ")}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                    Ordered: {new Date(order.createdAt).toLocaleString()}
                  </div>

                  {order.paymentProof && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <a
                        href={`http://localhost:5000${order.paymentProof}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#2563eb", fontSize: "0.85rem" }}
                      >
                        📷 View Payment Proof
                      </a>
                    </div>
                  )}

                  {order.status === "PENDING" && (
                    <div style={{ marginTop: "0.8rem", display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => handleApproveOrder(order._id)}
                        style={{
                          background: "#059669", color: "white", border: "none",
                          borderRadius: "6px", padding: "0.4rem 1rem", cursor: "pointer", fontWeight: 600,
                        }}
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => handleRejectOrder(order._id)}
                        style={{
                          background: "#ef4444", color: "white", border: "none",
                          borderRadius: "6px", padding: "0.4rem 1rem", cursor: "pointer", fontWeight: 600,
                        }}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
