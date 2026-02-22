import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useContext } from "react";
import "./Navbar.css";

const Navbar = () => {
  const { role, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="logo">Felicity EMS</div>

      <div className="nav-links">
        {!role && (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}

        {role === "PARTICIPANT" && (
          <>
            <Link to="/participant">Dashboard</Link>
            <Link to="/events">Browse Events</Link>
            <Link to="/organizers">Clubs / Organizers</Link>
            <Link to="/profile">Profile</Link>
            <button onClick={handleLogout}>Logout</button>
          </>
        )}

        {role === "ORGANIZER" && (
          <>
            <Link to="/organizer">Dashboard</Link>
            <Link to="/events/create">Create Event</Link>
            <Link to="/organizer/ongoing">Ongoing Events</Link>
            <Link to="/profile">Profile</Link>
            <button onClick={handleLogout}>Logout</button>
          </>
        )}

        {role === "ADMIN" && (
          <>
            <Link to="/admin">Dashboard</Link>
            <Link to="/admin/organizers">Manage Clubs</Link>
            <Link to="/admin/password-requests">
              Password Reset Requests
            </Link>
            <button onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;


