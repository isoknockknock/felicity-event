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

  return (
    <div className="profile-editor">
      {isEditing ? (
        <div className="edit-mode">
          <div className="profile-field">
            <label>Login Email <span className="non-editable">(Fixed)</span></label>
            <input value={data.email} disabled />
          </div>
          <div className="profile-field">
            <label>Organizer Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="profile-field">
            <label>Category</label>
            <input
              type="text"
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
            />
          </div>
          <div className="profile-field">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows="4"
            />
          </div>
          <div className="profile-field">
            <label>Public Contact Email</label>
            <input
              type="email"
              value={formData.contactEmail}
              onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
            />
          </div>
          <div className="profile-field">
            <label>Contact Number</label>
            <input
              type="text"
              value={formData.contactNumber}
              onChange={e => setFormData({ ...formData, contactNumber: e.target.value })}
            />
          </div>
          <div className="profile-field">
            <label>Discord Webhook Notification URL</label>
            <input
              type="url"
              value={formData.discordWebhookUrl}
              onChange={e => setFormData({ ...formData, discordWebhookUrl: e.target.value })}
              placeholder="https://discord.com/api/webhooks/..."
            />
          </div>
          <div className="profile-actions">
            <button className="primary full-width" onClick={handleSave}>Save Profile</button>
            <button className="secondary full-width" onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="view-mode">
          <div className="profile-field">
            <label>Organizer</label>
            <p>{data.name}</p>
          </div>
          <div className="profile-field">
            <label>Category</label>
            <p>{data.category || "—"}</p>
          </div>
          <div className="profile-field">
            <label>Email</label>
            <p>{data.email}</p>
          </div>
          <div className="profile-field">
            <label>Discord Notifications</label>
            <p>{data.discordWebhookUrl ? "✅ Active" : "❌ Not Configured"}</p>
          </div>
          <div className="profile-actions">
            <button className="primary" onClick={() => setIsEditing(true)}>Edit Profile</button>
            <button className="secondary" onClick={requestPasswordReset}>Request Password Reset</button>
          </div>
        </div>
      )}
      {(updateMessage || message) && (
        <div className={`profile-message ${(updateMessage || message).includes("Failed") ? "error" : ""}`}>
          {updateMessage || message}
        </div>
      )}
    </div>
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
      setStatusMsg("Profile updated successfully.");
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
        setPwMsg("Please provide all password fields.");
        return;
      }
      if (pw.newPassword !== pw.confirm) {
        setPwMsg("Passwords do not match.");
        return;
      }

      await API.post("/participants/me/password", {
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword
      });
      setPw({ currentPassword: "", newPassword: "", confirm: "" });
      setPwMsg("Password changed successfully.");
    } catch (err) {
      setPwMsg(err.response?.data?.message || "Failed to update password");
    }
  };

  return (
    <div className="profile-editor">
      {!isEditing ? (
        <div className="view-mode">
          <div className="profile-field">
            <label>Name</label>
            <p>{data.firstName} {data.lastName}</p>
          </div>
          <div className="profile-field">
            <label>College</label>
            <p>{data.collegeName || "—"}</p>
          </div>
          <div className="profile-field">
            <label>Interests</label>
            <p>{(data.interests || []).length > 0 ? data.interests.join(", ") : "—"}</p>
          </div>
          <div className="profile-actions" style={{ marginBottom: "2rem" }}>
            <button className="primary" onClick={() => setIsEditing(true)}>Edit Profile Details</button>
          </div>

          <div className="security-section">
            <h3>Update Security</h3>
            <div className="profile-field">
              <label>Current Password</label>
              <input
                type="password"
                value={pw.currentPassword}
                onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
              />
            </div>
            <div className="profile-field">
              <label>New Password</label>
              <input
                type="password"
                value={pw.newPassword}
                onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
              />
            </div>
            <div className="profile-field">
              <label>Confirm Password</label>
              <input
                type="password"
                value={pw.confirm}
                onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
              />
            </div>
            <button className="primary sm" onClick={changePassword}>Update Password</button>
            {pwMsg && <div className={`profile-message ${pwMsg.includes("Failed") || pwMsg.includes("not match") ? "error" : ""}`}>{pwMsg}</div>}
          </div>
        </div>
      ) : (
        <div className="edit-mode">
          <div className="profile-field">
            <label>First Name</label>
            <input
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
          </div>
          <div className="profile-field">
            <label>Last Name</label>
            <input
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>
          <div className="profile-field">
            <label>College / Organization</label>
            <input
              value={formData.collegeName}
              onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
            />
          </div>
          <div className="profile-field">
            <label>Interests (comma separated)</label>
            <input
              value={formData.interestsText}
              onChange={(e) => setFormData({ ...formData, interestsText: e.target.value })}
            />
          </div>

          <div className="profile-field">
            <label>Followed Clubs</label>
            <div style={{
              maxHeight: 180,
              overflow: "auto",
              padding: "1rem",
              background: "var(--bg-tertiary)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)"
            }}>
              {organizers.filter(o => o.isActive !== false).map((o) => (
                <label key={o._id} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formData.followedClubs.includes(String(o._id))}
                    onChange={() => toggleFollowed(String(o._id))}
                    style={{ width: "auto", marginBottom: 0 }}
                  />
                  <span>{o.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="profile-actions">
            <button className="primary full-width" onClick={saveProfile}>Save Profile</button>
            <button className="secondary full-width" onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </div>
      )}
      {statusMsg && <div className={`profile-message ${statusMsg.includes("Failed") ? "error" : ""}`}>{statusMsg}</div>}
    </div>
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
      let res;
      if (role === "PARTICIPANT") res = await API.get("/participants/me");
      else if (role === "ORGANIZER") res = await API.get("/organizers/me");
      else if (role === "ADMIN") res = await API.get("/admin/me");

      setData(res.data);
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
      setMessage("Success: Password reset request sent to Admin.");
    } catch (err) {
      setMessage("Failed: Could not send request.");
    }
  };

  if (loading) return <div className="profile-container"><p className="p-muted">Loading your profile...</p></div>;
  if (!data) return <div className="profile-container"><p className="error">No profile data found.</p></div>;

  return (
    <div className="profile-container">
      <div className="profile-card premium-card">
        <h2>{role === "ORGANIZER" ? "Club Profile" : "Account Profile"}</h2>

        {role === "PARTICIPANT" && (
          <ParticipantProfileEditor
            data={data}
            onUpdate={fetchProfile}
          />
        )}

        {role === "ORGANIZER" && (
          <OrganizerProfileEditor
            data={data}
            onUpdate={fetchProfile}
            requestPasswordReset={requestPasswordReset}
            message={message}
          />
        )}

        {role === "ADMIN" && (
          <div className="view-mode">
            <div className="profile-field">
              <label>Administrator</label>
              <p>{data.email}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
