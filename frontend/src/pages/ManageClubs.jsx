import { useEffect, useState } from "react";
import API from "../services/api";
import "./ManageClubs.css";

export default function ManageClubs() {
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    email: ""
  });

  useEffect(() => {
    fetchOrganizers();
  }, []);

  const fetchOrganizers = async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/organizers");
      setOrganizers(res.data);
    } catch (err) {
      setMessage("Failed to load organizers.");
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrganizer = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await API.post("/admin/organizers", formData);
      setMessage(
        `Organizer created! Email: ${res.data.loginEmail}, Temporary Password: ${res.data.temporaryPassword}`
      );
      setFormData({ name: "", category: "", description: "", email: "" });
      setShowAddForm(false);
      fetchOrganizers();
    } catch (err) {
      setMessage(
        err.response?.data?.message || "Failed to create organizer."
      );
    }
  };

  const handleRemoveOrganizer = async (id) => {
    if (!window.confirm("Are you sure you want to disable this organizer?")) {
      return;
    }

    try {
      await API.delete(`/admin/organizers/${id}`);
      setMessage("Organizer disabled successfully.");
      fetchOrganizers();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to disable organizer.");
    }
  };

  const handleArchiveOrganizer = async (id) => {
    if (!window.confirm("Are you sure you want to archive this organizer? Archived organizers are disabled and marked for long-term storage.")) {
      return;
    }

    try {
      await API.post(`/admin/organizers/${id}/archive`);
      setMessage("Organizer archived successfully.");
      fetchOrganizers();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to archive organizer.");
    }
  };

  const handleDeleteOrganizer = async (id) => {
    const confirmMsg = "⚠️ WARNING: This will PERMANENTLY DELETE the organizer account and all associated data. This action CANNOT be undone.\n\nAre you absolutely sure?";
    if (!window.confirm(confirmMsg)) {
      return;
    }

    // Double confirmation
    if (!window.confirm("Final confirmation: Permanently delete this organizer?")) {
      return;
    }

    try {
      await API.delete(`/admin/organizers/${id}/permanent`);
      setMessage("Organizer permanently deleted.");
      fetchOrganizers();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to delete organizer.");
    }
  };

  if (loading) {
    return <div className="manage-clubs-center">Loading organizers...</div>;
  }

  return (
    <div className="manage-clubs-container">
      <div className="manage-clubs-header">
        <h1>Manage Clubs</h1>
        <button
          className="add-btn"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setMessage("");
          }}
        >
          {showAddForm ? "Cancel" : "+ Add Organizer"}
        </button>
      </div>

      {message && (
        <div className={`manage-clubs-message ${message.includes("Failed") ? "error" : "success"}`}>
          {message}
        </div>
      )}

      {showAddForm && (
        <div className="add-organizer-form">
          <h2>Add New Organizer</h2>
          <form onSubmit={handleAddOrganizer}>
            <input
              type="text"
              placeholder="Name"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Category"
              required
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
            />
            <input
              type="email"
              placeholder="Email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
            <textarea
              placeholder="Description"
              required
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows="4"
            />
            <button type="submit" className="submit-btn">
              Create Organizer
            </button>
          </form>
        </div>
      )}

      <div className="organizers-list">
        {organizers.length === 0 ? (
          <div className="no-organizers">No organizers found.</div>
        ) : (
          organizers.map((organizer) => (
            <div
              key={organizer._id}
              className={`organizer-item ${!organizer.isActive ? "inactive" : ""}`}
            >
              <div className="organizer-info">
                <h3>{organizer.name}</h3>
                <div className="organizer-details">
                  <span className="category-badge">{organizer.category}</span>
                  <span className="email">{organizer.email}</span>
                </div>
                {organizer.description && (
                  <p className="description">{organizer.description}</p>
                )}
                {!organizer.isActive && (
                  <span className="inactive-badge">Inactive</span>
                )}
                {organizer.isArchived && (
                  <span className="archived-badge">Archived</span>
                )}
                {organizer.archivedAt && (
                  <span className="archived-date">
                    Archived: {new Date(organizer.archivedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="organizer-actions">
                {organizer.isActive && (
                  <>
                    <button
                      className="disable-btn"
                      onClick={() => handleRemoveOrganizer(organizer._id)}
                    >
                      Disable
                    </button>
                    <button
                      className="archive-btn"
                      onClick={() => handleArchiveOrganizer(organizer._id)}
                    >
                      Archive
                    </button>
                  </>
                )}
                <button
                  className="delete-btn"
                  onClick={() => handleDeleteOrganizer(organizer._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
