import { useEffect, useState, useContext, useCallback } from "react";
import { AuthContext } from "../context/AuthContext";
import API from "../services/api";
import "./Profile.css";

function OrganizerProfileEditor({ data, onUpdate, requestPasswordReset, message }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: data.name || "",
    category: data.category || "",
    description: data.description || "",
    contactEmail: data.contactEmail || "",
    contactNumber: data.contactNumber || "",
    discordWebhookUrl: data.discordWebhookUrl || ""
  });
  const [updateMessage, setUpdateMessage] = useState("");

  const handleSave = async () => {
    try {
      await API.put("/organizers/me", formData);
      setUpdateMessage("Profile updated successfully!");
      setIsEditing(false);
      onUpdate();
      setTimeout(() => setUpdateMessage(""), 3000);
    } catch (err) {
      setUpdateMessage(err.response?.data?.message || "Failed to update profile");
    }
  };

  if (isEditing) {
    return (
      <>
        <div className="profile-field">
          <strong>Login Email:</strong> {data.email} <span className="non-editable">(Non-editable)</span>
        </div>
        <div className="profile-field">
          <label>Name:</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="profile-input"
          />
        </div>
        <div className="profile-field">
          <label>Category:</label>
          <input
            type="text"
            value={formData.category}
            onChange={e => setFormData({ ...formData, category: e.target.value })}
            className="profile-input"
          />
        </div>
        <div className="profile-field">
          <label>Description:</label>
          <textarea
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            className="profile-textarea"
            rows="4"
          />
        </div>
        <div className="profile-field">
          <label>Contact Email:</label>
          <input
            type="email"
            value={formData.contactEmail}
            onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
            className="profile-input"
          />
        </div>
        <div className="profile-field">
          <label>Contact Number:</label>
          <input
            type="text"
            value={formData.contactNumber}
            onChange={e => setFormData({ ...formData, contactNumber: e.target.value })}
            className="profile-input"
          />
        </div>
        <div className="profile-field">
          <label>Discord Webhook URL:</label>
          <input
            type="url"
            value={formData.discordWebhookUrl}
            onChange={e => setFormData({ ...formData, discordWebhookUrl: e.target.value })}
            className="profile-input"
            placeholder="https://discord.com/api/webhooks/..."
          />
          <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.25rem" }}>
            New events will be auto-posted to this Discord channel when published.
          </div>
        </div>
        <div className="profile-actions">
          <button className="save-btn" onClick={handleSave}>
            Save Changes
          </button>
          <button className="cancel-btn" onClick={() => setIsEditing(false)}>
            Cancel
          </button>
        </div>
        {updateMessage && (
          <div className={`profile-message ${updateMessage.includes("Failed") ? "error" : ""}`}>
            {updateMessage}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="profile-field">
        <strong>Login Email:</strong> {data.email} <span className="non-editable">(Non-editable)</span>
      </div>
      <div className="profile-field">
        <strong>Name:</strong> {data.name}
      </div>
      <div className="profile-field">
        <strong>Category:</strong> {data.category || "Not set"}
      </div>
      <div className="profile-field">
        <strong>Description:</strong> {data.description || "Not set"}
      </div>
      {data.contactEmail && (
        <div className="profile-field">
          <strong>Contact Email:</strong> {data.contactEmail}
        </div>
      )}
      {data.contactNumber && (
        <div className="profile-field">
          <strong>Contact Number:</strong> {data.contactNumber}
        </div>
      )}
      <div className="profile-field">
        <strong>Discord Webhook:</strong> {data.discordWebhookUrl ? "✅ Configured" : "Not set"}
      </div>
      <div className="profile-actions">
        <button className="edit-btn" onClick={() => setIsEditing(true)}>
          Edit Profile
        </button>
        <button className="reset-btn" onClick={requestPasswordReset}>
          Request Password Reset
        </button>
      </div>
      {message && <div className="profile-message">{message}</div>}
    </>
  );
}

function ParticipantProfileEditor({ data, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [organizers, setOrganizers] = useState([]);
  const [statusMsg, setStatusMsg] = useState("");

  const [formData, setFormData] = useState({
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    contactNumber: data.contactNumber || "",
    collegeName: data.collegeName || "",
    interestsText: Array.isArray(data.interests) ? data.interests.join(", ") : "",
    followedClubs: Array.isArray(data.followedClubs) ? data.followedClubs.map(String) : []
  });

  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState("");

  useEffect(() => {
    API.get("/organizers")
      .then(res => setOrganizers(res.data || []))
      .catch(() => setOrganizers([]));
  }, []);

  const toggleFollowed = (id) => {
    const s = new Set(formData.followedClubs);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setFormData({ ...formData, followedClubs: Array.from(s) });
  };

  const saveProfile = async () => {
    try {
      setStatusMsg("");
      const interests = formData.interestsText
        ? formData.interestsText.split(",").map(x => x.trim()).filter(Boolean)
        : [];

      await API.put("/participants/me", {
        firstName: formData.firstName,
        lastName: formData.lastName,
        contactNumber: formData.contactNumber,
        collegeName: formData.collegeName,
        interests,
        followedClubs: formData.followedClubs
      });
      setStatusMsg("Profile updated.");
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      setStatusMsg(err.response?.data?.message || "Failed to update profile");
    }
  };

  const changePassword = async () => {
    try {
      setPwMsg("");
      if (!pw.currentPassword || !pw.newPassword) {
        setPwMsg("Enter current and new password.");
        return;
      }
      if (pw.newPassword !== pw.confirm) {
        setPwMsg("New password and confirm password do not match.");
        return;
      }

      await API.post("/participants/me/password", {
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword
      });
      setPw({ currentPassword: "", newPassword: "", confirm: "" });
      setPwMsg("Password updated.");
    } catch (err) {
      setPwMsg(err.response?.data?.message || "Failed to update password");
    }
  };

  return (
    <>
      <div className="profile-field">
        <strong>Email:</strong> {data.email} <span className="non-editable">(Non-editable)</span>
      </div>
      <div className="profile-field">
        <strong>Participant Type:</strong> {data.participantType} <span className="non-editable">(Non-editable)</span>
      </div>

      {!isEditing ? (
        <>
          <div className="profile-field">
            <strong>First Name:</strong> {data.firstName}
          </div>
          <div className="profile-field">
            <strong>Last Name:</strong> {data.lastName}
          </div>
          <div className="profile-field">
            <strong>Contact Number:</strong> {data.contactNumber || "—"}
          </div>
          <div className="profile-field">
            <strong>College / Organization:</strong> {data.collegeName || "—"}
          </div>
          <div className="profile-field">
            <strong>Selected Interests:</strong>{" "}
            {Array.isArray(data.interests) && data.interests.length > 0 ? data.interests.join(", ") : "—"}
          </div>
          <div className="profile-field">
            <strong>Followed Clubs:</strong>{" "}
            {Array.isArray(data.followedClubs) && data.followedClubs.length > 0
              ? `${data.followedClubs.length} club(s)`
              : "—"}
          </div>

          <div className="profile-actions">
            <button className="edit-btn" onClick={() => setIsEditing(true)}>
              Edit Profile
            </button>
          </div>
          {statusMsg && <div className="profile-message">{statusMsg}</div>}

          <hr style={{ margin: "18px 0", opacity: 0.25 }} />
          <div className="profile-field">
            <strong>Security</strong>
          </div>
          <div className="profile-field">
            <label>Current Password</label>
            <input
              className="profile-input"
              type="password"
              value={pw.currentPassword}
              onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
            />
            <label>New Password</label>
            <input
              className="profile-input"
              type="password"
              value={pw.newPassword}
              onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
            />
            <label>Confirm New Password</label>
            <input
              className="profile-input"
              type="password"
              value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
            />
            <div className="profile-actions">
              <button className="save-btn" onClick={changePassword}>
                Change Password
              </button>
            </div>
            {pwMsg && (
              <div className={`profile-message ${pwMsg.includes("Failed") ? "error" : ""}`}>
                {pwMsg}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="profile-field">
            <label>First Name</label>
            <input
              className="profile-input"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
          </div>
          <div className="profile-field">
            <label>Last Name</label>
            <input
              className="profile-input"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>
          <div className="profile-field">
            <label>Contact Number</label>
            <input
              className="profile-input"
              value={formData.contactNumber}
              onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
            />
          </div>
          <div className="profile-field">
            <label>College / Organization</label>
            <input
              className="profile-input"
              value={formData.collegeName}
              onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
            />
          </div>
          <div className="profile-field">
            <label>Selected Interests (comma separated)</label>
            <input
              className="profile-input"
              value={formData.interestsText}
              onChange={(e) => setFormData({ ...formData, interestsText: e.target.value })}
            />
          </div>

          <div className="profile-field">
            <label>Followed Clubs</label>
            <div style={{ maxHeight: 140, overflow: "auto", padding: 8, border: "1px solid #334155", borderRadius: 10 }}>
              {organizers.filter(o => o.isActive !== false).map((o) => (
                <label key={o._id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <input
                    type="checkbox"
                    checked={formData.followedClubs.includes(String(o._id))}
                    onChange={() => toggleFollowed(String(o._id))}
                  />
                  <span>{o.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="profile-actions">
            <button className="save-btn" onClick={saveProfile}>
              Save Changes
            </button>
            <button className="cancel-btn" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </div>
          {statusMsg && (
            <div className={`profile-message ${statusMsg.includes("Failed") ? "error" : ""}`}>
              {statusMsg}
            </div>
          )}
        </>
      )}
    </>
  );
}

export default function Profile() {
  const { role } = useContext(AuthContext);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      if (role === "PARTICIPANT") {
        const res = await API.get("/participants/me");
        setData(res.data);
      }

      if (role === "ORGANIZER") {
        const res = await API.get("/organizers/me");
        setData(res.data);
      }

      if (role === "ADMIN") {
        const res = await API.get("/admin/me");
        setData(res.data);
      }
    } catch (err) {
      console.error("Profile fetch failed", err);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (role) fetchProfile();
  }, [role, fetchProfile]);

  const requestPasswordReset = async () => {
    try {
      await API.post("/organizers/password-reset/request");
      setMessage("Password reset request sent to Admin.");
    } catch (err) {
      setMessage("Failed to send request.");
    }
  };

  if (loading) return <div className="profile-center">Loading profile...</div>;
  if (!data) return <div className="profile-center">No data found.</div>;

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h2>My Profile</h2>

        <div className="profile-field">
          <strong>Name:</strong>{" "}
          {data.firstName
            ? `${data.firstName} ${data.lastName}`
            : data.name}
        </div>

        <div className="profile-field">
          <strong>Email:</strong> {data.email || data.contactEmail}
        </div>

        {role === "PARTICIPANT" && (
          <ParticipantProfileEditor
            data={data}
            onUpdate={() => {
              fetchProfile();
            }}
          />
        )}

        {role === "ORGANIZER" && (
          <OrganizerProfileEditor
            data={data}
            onUpdate={() => {
              fetchProfile();
            }}
            requestPasswordReset={requestPasswordReset}
            message={message}
          />
        )}

        {message && <div className="profile-message">{message}</div>}
      </div>
    </div>
  );
}
