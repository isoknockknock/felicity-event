import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";

export default function OrganizerOngoing() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setMessage("");
        const res = await API.get("/events/organizer");
        setEvents(res.data || []);
      } catch (err) {
        setMessage(err.response?.data?.message || "Failed to load ongoing events");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const ongoing = useMemo(() => {
    return (events || []).filter((e) => e.status === "ONGOING");
  }, [events]);

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Ongoing Events</h1>
        <Link to="/organizer">
          <button>← Back to Dashboard</button>
        </Link>
      </div>

      {message && (
        <div style={{ marginTop: 12, color: "#b91c1c", fontWeight: 600 }}>{message}</div>
      )}

      <div style={{ marginTop: 16 }}>
        {ongoing.length === 0 ? (
          <div style={{ color: "#6b7280" }}>No ongoing events.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {ongoing.map((e) => (
              <div
                key={e._id}
                style={{
                  background: "white",
                  borderRadius: 12,
                  padding: 16,
                  boxShadow: "0 5px 15px rgba(0,0,0,0.06)"
                }}
              >
                <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{e.name}</div>
                <div style={{ color: "#6b7280", marginTop: 6 }}>
                  <b>Type:</b> {e.type} · <b>Status:</b> {e.status}
                </div>
                {e.startDate && (
                  <div style={{ color: "#6b7280", marginTop: 6 }}>
                    <b>Start:</b> {new Date(e.startDate).toLocaleString()}
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <Link to={`/organizer/events/${e._id}`}>
                    <button className="primary">View</button>
                  </Link>
                  <Link to={`/organizer/events/${e._id}/scanner`}>
                    <button style={{ background: "#059669", color: "white", border: "none", borderRadius: 6, padding: "0.4rem 0.8rem", cursor: "pointer", fontWeight: 600 }}>
                      📷 Scanner
                    </button>
                  </Link>
                  <Link to={`/organizer/events/${e._id}/edit`}>
                    <button>Edit</button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

