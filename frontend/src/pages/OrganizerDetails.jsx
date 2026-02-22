import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../services/api";
import "./OrganizerDetails.css";

export default function OrganizerDetails() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/organizers/${id}`);
        setData(res.data);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <div className="container">Loading...</div>;
  if (!data) return <div className="container">Organizer not found.</div>;

  const { organizer, upcoming, past } = data;

  return (
    <div className="container organizer-detail">
      <div className="org-head">
        <Link to="/organizers" className="back-link">← Back</Link>
      </div>

      <div className="org-card">
        <h1>{organizer.name}</h1>
        <div className="org-meta">
          <span><b>Category:</b> {organizer.category || "—"}</span>
          <span><b>Contact:</b> {organizer.contactEmail || organizer.email || "—"}</span>
        </div>
        <p className="org-desc">{organizer.description || "No description provided."}</p>
      </div>

      <div className="org-sections">
        <div className="org-section">
          <h2>Upcoming Events</h2>
          {upcoming?.length ? (
            <div className="org-events">
              {upcoming.map((e) => (
                <Link key={e._id} className="org-event-card" to={`/events/${e._id}`}>
                  <div className="title">{e.name}</div>
                  <div className="muted"><b>Type:</b> {e.type}</div>
                  {e.startDate && <div className="muted"><b>Starts:</b> {new Date(e.startDate).toLocaleString()}</div>}
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty">No upcoming events.</div>
          )}
        </div>

        <div className="org-section">
          <h2>Past Events</h2>
          {past?.length ? (
            <div className="org-events">
              {past.map((e) => (
                <Link key={e._id} className="org-event-card" to={`/events/${e._id}`}>
                  <div className="title">{e.name}</div>
                  <div className="muted"><b>Type:</b> {e.type}</div>
                  {e.endDate && <div className="muted"><b>Ended:</b> {new Date(e.endDate).toLocaleString()}</div>}
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty">No past events.</div>
          )}
        </div>
      </div>
    </div>
  );
}

