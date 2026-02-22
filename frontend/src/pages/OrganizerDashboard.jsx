import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import "./OrganizerDashboard.css";

export default function OrganizerDashboard() {
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await API.get("/events/organizer");
      setMyEvents(res.data);
      setLoading(false);
      
      // Fetch analytics after events are loaded
      fetchAnalytics(res.data);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const fetchAnalytics = async (events) => {
    try {
      const completedEvents = events.filter(e => e.status === "COMPLETED");
      if (completedEvents.length === 0) return;

      let totalRegistrations = 0;
      let totalAttendance = 0;
      let totalRevenue = 0;

      for (const event of completedEvents) {
        try {
          const res = await API.get(`/events/${event._id}/analytics`);
          totalRegistrations += res.data.registrations;
          totalAttendance += res.data.attendance;
          totalRevenue += res.data.revenue;
        } catch (err) {
          console.error(`Failed to fetch analytics for event ${event._id}`);
        }
      }

      setAnalytics({
        totalRegistrations,
        totalAttendance,
        totalRevenue,
        averageAttendanceRate: totalRegistrations > 0
          ? ((totalAttendance / totalRegistrations) * 100).toFixed(2)
          : 0
      });
    } catch (err) {
      console.error("Failed to fetch analytics", err);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      DRAFT: "#6b7280",
      PUBLISHED: "#3b82f6",
      ONGOING: "#22c55e",
      COMPLETED: "#8b5cf6",
      CLOSED: "#ef4444"
    };
    return colors[status] || "#6b7280";
  };

  const getTypeLabel = (type) => {
    return type === "NORMAL" ? "Normal Event" : "Merchandise";
  };

  if (loading) return <div className="organizer-dashboard-container">Loading...</div>;

  const completedEvents = myEvents.filter(e => e.status === "COMPLETED");

  return (
    <div className="organizer-dashboard-container">
      <div className="dashboard-header">
        <h1>Organizer Dashboard</h1>
        <Link to="/events/create" className="create-event-btn">
          + Create New Event
        </Link>
      </div>

      {/* Event Analytics */}
      {completedEvents.length > 0 && analytics && (
        <div className="analytics-section">
          <h2>Event Analytics (Completed Events)</h2>
          <div className="analytics-grid">
            <div className="analytics-card">
              <div className="analytics-label">Total Registrations</div>
              <div className="analytics-value">{analytics.totalRegistrations}</div>
            </div>
            <div className="analytics-card">
              <div className="analytics-label">Total Attendance</div>
              <div className="analytics-value">{analytics.totalAttendance}</div>
            </div>
            <div className="analytics-card">
              <div className="analytics-label">Total Revenue</div>
              <div className="analytics-value">₹{analytics.totalRevenue}</div>
            </div>
            <div className="analytics-card">
              <div className="analytics-label">Avg. Attendance Rate</div>
              <div className="analytics-value">{analytics.averageAttendanceRate}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Events Carousel */}
      <div className="events-section">
        <h2>My Events</h2>
        {myEvents.length === 0 ? (
          <div className="no-events">
            <p>No events created yet.</p>
            <Link to="/events/create" className="create-event-link">
              Create your first event
            </Link>
          </div>
        ) : (
          <div className="events-carousel">
            {myEvents.map(event => (
              <Link
                key={event._id}
                to={`/organizer/events/${event._id}`}
                className="event-card"
              >
                <div className="event-card-header">
                  <h3>{event.name}</h3>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(event.status) }}
                  >
                    {event.status}
                  </span>
                </div>
                <div className="event-card-body">
                  <div className="event-info-item">
                    <span className="info-label">Type:</span>
                    <span>{getTypeLabel(event.type)}</span>
                  </div>
                  {event.startDate && (
                    <div className="event-info-item">
                      <span className="info-label">Start:</span>
                      <span>{new Date(event.startDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {event.registrationLimit && (
                    <div className="event-info-item">
                      <span className="info-label">Limit:</span>
                      <span>{event.registrationLimit} participants</span>
                    </div>
                  )}
                </div>
                <div className="event-card-footer">
                  <span className="view-link">View Details →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
