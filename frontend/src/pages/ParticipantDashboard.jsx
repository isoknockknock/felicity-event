import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import "./ParticipantDashboard.css";

const TABS = ["Normal", "Merchandise", "Completed", "Cancelled"];

export default function ParticipantDashboard() {
  const [upcoming, setUpcoming] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(TABS[0]);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const reminderMinutes = [1440, 60];

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
      const isCompleted = event?.status === "COMPLETED" || (event?.endDate && new Date(event.endDate) < now);

      if (isCompleted) {
        completed.push(r);
        continue;
      }

      const isCancelledOrRejected = r.participationStatus === "CANCELLED" || r.participationStatus === "REJECTED";

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

  const handleBatchExport = () => {
    const params = new URLSearchParams({
      timezone: timezone,
      reminders: reminderMinutes.join(",")
    });
    window.open(`http://localhost:5000/api/participants/me/calendar/export?${params.toString()}`);
  };

  if (loading) return <div className="container p-muted">Synchronizing your dashboard...</div>;

  return (
    <div className="container participant-dash">
      <div className="dash-hero">
        <div className="dash-title-area">
          <h1>Participant Workspace</h1>
          <p className="p-muted">Manage your registrations, merchandise, and calendar.</p>
        </div>

        {upcoming.length > 0 && (
          <div className="export-controls glass-panel">
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              <option value="UTC">UTC</option>
              <option value="Asia/Kolkata">IST (India)</option>
              <option value="America/New_York">ET (US)</option>
              <option value="Europe/London">GMT (UK)</option>
            </select>
            <button onClick={handleBatchExport} className="primary sm">
              Export Calendar
            </button>
          </div>
        )}
      </div>

      <section className="dash-section">
        <div className="section-header">
          <h2>Upcoming Adventures</h2>
          <span className="count-badge">{upcoming.length}</span>
        </div>

        {upcoming.length === 0 ? (
          <div className="empty-state">
            <p>You haven't registered for any upcoming events yet.</p>
            <Link to="/events"><button className="primary" style={{ marginTop: "1rem" }}>Explore Events</button></Link>
          </div>
        ) : (
          <div className="upcoming-scroller">
            {upcoming.map((u) => (
              <Link key={u._id} to={`/events/${u.event?._id}`} className="premium-card upcoming-card">
                <div className="event-label">{u.event?.type}</div>
                <div className="upcoming-title">{u.event?.name}</div>
                <div className="upcoming-meta">
                  <div className="meta-row">
                    <span>Organizer</span>
                    <b>{u.event?.organizer?.name || "—"}</b>
                  </div>
                  <div className="meta-row">
                    <span>Date</span>
                    <b>{u.event?.startDate ? new Date(u.event.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : "—"}</b>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="dash-section">
        <div className="history-container premium-card">
          <div className="history-header">
            <h2>Your Journey</h2>
            <div className="history-tabs">
              {TABS.map((t) => (
                <button
                  key={t}
                  className={`history-tab-btn ${t === tab ? "active" : ""}`}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="history-content">
            {shown.length === 0 ? (
              <div className="empty-state-mini">No history in this category.</div>
            ) : (
              <div className="history-table">
                {shown.map((r) => (
                  <div key={r.id} className="history-row">
                    <div className="history-info">
                      <div className="history-event-name">{r.event?.name || "Event"}</div>
                      <div className="history-sub">
                        <span>{r.event?.organizer?.name}</span>
                        <span className="dot">•</span>
                        <span>{r.participationStatus}</span>
                      </div>
                    </div>
                    <div className="history-action">
                      {r.ticketId ? (
                        <Link to={`/tickets/${r.ticketId}`} className="ticket-badge">
                          View Ticket
                        </Link>
                      ) : (
                        <span className="p-muted">No Ticket</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
