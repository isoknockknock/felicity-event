import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    participantType: "IIIT"
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await API.post("/auth/register/participant", {
        ...form,
        role: "PARTICIPANT"
      });
      alert("Account created successfully!");
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center"
    }}>
      <div style={{
        width: "400px",
        background: "white",
        padding: "2.5rem",
        borderRadius: "12px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.08)"
      }}>
        <h2 style={{ marginBottom: "1.5rem", textAlign: "center" }}>
          Create Account
        </h2>

        <form onSubmit={handleSubmit}>
          <input
            placeholder="First Name"
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          />

          <input
            placeholder="Last Name"
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />

          <input
            placeholder="Email"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <input
            type="password"
            placeholder="Password"
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <select
            value={form.participantType}
            onChange={(e) =>
              setForm({ ...form, participantType: e.target.value })
            }
          >
            <option value="IIIT">IIIT Student</option>
            <option value="NON_IIIT">Non-IIIT Participant</option>
          </select>

          <button className="primary" style={{ width: "100%" }}>
            Register
          </button>
        </form>
      </div>
    </div>
  );
}
