import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { AuthContext } from "../context/AuthContext";

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

      // Save token first
      localStorage.setItem("token", token);
      localStorage.setItem("role", form.role);

      login(token, form.role);

      if (form.role === "PARTICIPANT") {
        // Check if participant needs onboarding
        const profile = await API.get("/participants/me", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!profile.data.interests || profile.data.interests.length === 0) {
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
      setError(
        err.response?.data?.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f5f7fb"
      }}
    >
      <div
        style={{
          width: "400px",
          background: "white",
          padding: "2.5rem",
          borderRadius: "12px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.08)"
        }}
      >
        <h2 style={{ marginBottom: "1.5rem", textAlign: "center" }}>
          Felicity EMS Login
        </h2>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#b91c1c",
              padding: "0.8rem",
              borderRadius: "6px",
              marginBottom: "1rem",
              fontSize: "0.9rem"
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            placeholder="Email"
            required
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
          />

          <input
            type="password"
            placeholder="Password"
            required
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
          />

          <select
            onChange={(e) =>
              setForm({ ...form, role: e.target.value })
            }
          >
            <option value="PARTICIPANT">Participant</option>
            <option value="ORGANIZER">Organizer</option>
            <option value="ADMIN">Admin</option>
          </select>

          <button
            className="primary"
            style={{ width: "100%", marginTop: "0.5rem" }}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
