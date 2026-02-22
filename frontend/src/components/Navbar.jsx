import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useContext } from "react";
import ThemeToggle from "./ThemeToggle";
import "./Navbar.css";

const Navbar = () => {
  const { role, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar glass-panel">
      <div className="navbar-container">
        <Link to="/" className="logo">
          <span className="logo-accent">Felicity</span> EMS
        </Link>

        <div className="nav-links">
          {!role && (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="nav-link btn-primary">Register</Link>
            </>
          )}

          {role === "PARTICIPANT" && (
            <>
              <Link to="/participant" className="nav-link">Dashboard</Link>
              <Link to="/events" className="nav-link">Events</Link>
              <Link to="/organizers" className="nav-link">Clubs</Link>
              <Link to="/profile" className="nav-link">Profile</Link>
              <button onClick={handleLogout} className="logout-btn">Logout</button>
            </>
          )}

          {role === "ORGANIZER" && (
            <>
              <Link to="/organizer" className="nav-link">Dashboard</Link>
              <Link to="/events/create" className="nav-link">Create Event</Link>
              <Link to="/organizer/ongoing" className="nav-link">Ongoing</Link>
              <Link to="/profile" className="nav-link">Profile</Link>
              <button onClick={handleLogout} className="logout-btn">Logout</button>
            </>
          )}

          {role === "ADMIN" && (
            <>
              <Link to="/admin" className="nav-link">Dashboard</Link>
              <Link to="/admin/organizers" className="nav-link">Clubs</Link>
              <Link to="/admin/password-requests" className="nav-link">Requests</Link>
              <button onClick={handleLogout} className="logout-btn">Logout</button>
            </>
          )}

          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
