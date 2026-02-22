import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    organizers: 0,
    requests: 0,
    totalEvents: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [orgsRes, reqsRes, eventsRes] = await Promise.all([
          API.get("/admin/organizers"),
          API.get("/admin/password-reset-requests"),
          API.get("/events")
        ]);

        setStats({
          organizers: orgsRes.data.length,
          requests: reqsRes.data.filter(r => r.status === "PENDING").length,
          totalEvents: eventsRes.data.length
        });
      } catch (err) {
        console.error("Dashboard stats failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="container p-muted">Accessing administrative panel...</div>;

  return (
    <div className="admin-dash-container">
      <div className="admin-header">
        <div className="admin-title">
          <h1>Admin Control Center</h1>
          <p className="p-muted">Manage the Felicity Event Management ecosystem.</p>
        </div>
      </div>

      <div className="admin-stats-grid">
        <div className="stat-card premium-card">
          <span className="stat-label">Active Clubs</span>
          <span className="stat-value">{stats.organizers}</span>
        </div>
        <div className="stat-card premium-card">
          <span className="stat-label">Pending Requests</span>
          <span className="stat-value" style={{ color: stats.requests > 0 ? "var(--warning)" : "var(--success)" }}>
            {stats.requests}
          </span>
        </div>
        <div className="stat-card premium-card">
          <span className="stat-label">Live Events</span>
          <span className="stat-value">{stats.totalEvents}</span>
        </div>
      </div>

      <div className="admin-section">
        <h2>Governance & Management</h2>
        <div className="admin-actions-grid">
          <Link to="/admin/organizers" className="action-card premium-card">
            <h3>Club Management</h3>
            <p>Onboard new club organizers, disable accounts, or archive historical club data.</p>
            <span className="action-btn">Manage Clubs →</span>
          </Link>

          <Link to="/admin/password-requests" className="action-card premium-card">
            <h3>Reset Requests</h3>
            <p>Review and approve password reset requests from organizers who've lost access.</p>
            <span className="action-btn">View Requests →</span>
          </Link>

          <Link to="/events" className="action-card premium-card">
            <h3>Event Oversight</h3>
            <p>Monitor all events currently published on the platform and check their status.</p>
            <span className="action-btn">Explore Events →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
