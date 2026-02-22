import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";
import { AuthContext } from "../context/AuthContext";
import "./Login.css";

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "PARTICIPANT"
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await API.post("/auth/login", form);
      const token = res.data.token;

      localStorage.setItem("token", token);
      localStorage.setItem("role", form.role);

      login(token, form.role);

      if (form.role === "PARTICIPANT") {
        const profile = await API.get("/participants/me", {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!profile.data.onboardingCompleted) {
          navigate("/onboarding");
        } else {
          navigate("/participant");
        }
      } else if (form.role === "ORGANIZER") {
        navigate("/organizer");
      } else if (form.role === "ADMIN") {
        navigate("/admin");
      }

    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card premium-card">
        <div className="login-header">
          <h1>Welcome Back</h1>
          <p>Login to your Felicity EMS account</p>
        </div>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="name@iiit.ac.in"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <div className="input-group">
            <label htmlFor="role">Login As</label>
            <select
              id="role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="PARTICIPANT">Participant</option>
              <option value="ORGANIZER">Organizer</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <button type="submit" className="primary full-width" disabled={loading}>
            {loading ? "Verifying..." : "Sign In"}
          </button>
        </form>

        <div className="login-footer">
          <p>Don't have an account? <Link to="/register">Create one</Link></p>
        </div>
      </div>
    </div>
  );
}
