import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import "./ParticipantDashboard.css";

const TABS = ["Normal", "Merchandise", "Completed", "Cancelled/Rejected"];

export default function ParticipantDashboard() {
  const [upcoming, setUpcoming] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(TABS[0]);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const reminderMinutes = [1440, 60]; // Default reminders: 1 day and 1 hour before

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [upRes, recRes] = await Promise.all([
          API.get("/participants/me/upcoming").catch(() => ({ data: [] })),
          API.get("/participants/me/records").catch(() => ({ data: [] }))
        ]);
        setUpcoming(upRes.data || []);
        setRecords(recRes.data || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const categorized = useMemo(() => {
    const now = new Date();
    const normal = [];
    const merch = [];
    const completed = [];
    const cancelled = [];

    for (const r of records) {
      const event = r.event;
      const isCompleted =
        event?.status === "COMPLETED" ||
        (event?.endDate && new Date(event.endDate) < now);

      if (isCompleted) {
        completed.push(r);
        continue;
      }

      const isCancelledOrRejected =
        r.participationStatus === "CANCELLED" || r.participationStatus === "REJECTED";

      if (isCancelledOrRejected) {
        cancelled.push(r);
        continue;
      }

      if (event?.type === "MERCHANDISE" || r.recordType === "MERCH_ORDER") {
        merch.push(r);
      } else {
        normal.push(r);
      }
    }

    return { normal, merch, completed, cancelled };
  }, [records]);

  const shown = useMemo(() => {
    if (tab === "Normal") return categorized.normal;
    if (tab === "Merchandise") return categorized.merch;
    if (tab === "Completed") return categorized.completed;
    return categorized.cancelled;
  }, [tab, categorized]);

  if (loading) return <div className="container">Loading...</div>;

  const handleBatchExport = () => {
    const params = new URLSearchParams({
      timezone: timezone,
      reminders: reminderMinutes.join(",")
    });
    window.open(`http://localhost:5000/api/participants/me/calendar/export?${params.toString()}`);
  };

  return (
    <div className="container participant-dash">
      <div className="participant-dash-header">
        <h1>My Events Dashboard</h1>
        {upcoming.length > 0 && (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.9rem" }}
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">ET</option>
              <option value="America/Chicago">CT</option>
              <option value="America/Los_Angeles">PT</option>
              <option value="Asia/Kolkata">IST</option>
            </select>
            <button
              onClick={handleBatchExport}
              className="primary"
              style={{ fontSize: "0.9rem", padding: "0.5rem 1rem" }}
            >
              📅 Export All Events
            </button>
          </div>
        )}
      </div>

      <section className="participant-section">
        <h2>Upcoming Events</h2>
        {upcoming.length === 0 ? (
          <div className="empty">No upcoming registered events.</div>
        ) : (
          <div className="upcoming-grid">
            {upcoming.map((u) => (
              <Link key={u._id} to={`/events/${u.event?._id}`} className="upcoming-card">
                <div className="upcoming-title">{u.event?.name}</div>
                <div className="muted">
                  <b>Type:</b> {u.event?.type}
                </div>
                <div className="muted">
                  <b>Organizer:</b> {u.event?.organizer?.name || "—"}
                </div>
                <div className="muted">
                  <b>Schedule:</b>{" "}
                  {u.event?.startDate ? new Date(u.event.startDate).toLocaleString() : "—"}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="participant-section">
        <div className="history-head">
          <h2>Participation History</h2>
          <div className="tabs">
            {TABS.map((t) => (
              <button
                key={t}
                className={`tab-btn ${t === tab ? "active" : ""}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="empty">No records in this category.</div>
        ) : (
          <div className="records-list">
            {shown.map((r) => (
              <div key={r.id} className="record-row">
                <div className="record-main">
                  <div className="record-title">{r.event?.name || "Event"}</div>
                  <div className="record-meta">
                    <span><b>Type:</b> {r.event?.type}</span>
                    <span><b>Organizer:</b> {r.event?.organizer?.name || "—"}</span>
                    <span><b>Status:</b> {r.participationStatus}</span>
                    <span><b>Team:</b> {r.teamName || "—"}</span>
                  </div>
                </div>
                <div className="record-actions">
                  {r.ticketId ? (
                    <Link to={`/tickets/${r.ticketId}`} className="ticket-link">
                      Ticket: {r.ticketId}
                    </Link>
                  ) : (
                    <span className="muted">No ticket</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
