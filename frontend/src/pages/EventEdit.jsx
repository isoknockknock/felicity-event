import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import "./EventEdit.css";

export default function EventEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [message, setMessage] = useState("");
  const [hasRegistrations, setHasRegistrations] = useState(false);

  const fetchEvent = useCallback(async () => {
    try {
      const res = await API.get(`/events/${id}`);
      const eventData = res.data;
      setEvent(eventData);

      // Check if event has registrations
      try {
        const participantsRes = await API.get(`/events/${id}/participants`);
        setHasRegistrations(participantsRes.data.length > 0);
      } catch {
        setHasRegistrations(false);
      }

      // Set form data based on status
      if (eventData.status === "DRAFT") {
        setFormData({
          name: eventData.name || "",
          description: eventData.description || "",
          eligibility: eventData.eligibility || "",
          registrationDeadline: eventData.registrationDeadline
            ? new Date(eventData.registrationDeadline).toISOString().slice(0, 16)
            : "",
          startDate: eventData.startDate
            ? new Date(eventData.startDate).toISOString().slice(0, 16)
            : "",
          endDate: eventData.endDate
            ? new Date(eventData.endDate).toISOString().slice(0, 16)
            : "",
          registrationLimit: eventData.registrationLimit || 0,
          registrationFee: eventData.registrationFee || 0,
          tags: eventData.tags ? eventData.tags.join(", ") : "",
          registrationForm: eventData.registrationForm || [],
          merchandiseItems: eventData.merchandiseItems || []
        });
      } else if (eventData.status === "PUBLISHED") {
        // Limited edits for published events
        setFormData({
          description: eventData.description || "",
          registrationDeadline: eventData.registrationDeadline
            ? new Date(eventData.registrationDeadline).toISOString().slice(0, 16)
            : "",
          registrationLimit: eventData.registrationLimit || 0
        });
      }

      setLoading(false);
    } catch (err) {
      setMessage("Failed to load event");
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      if (event.status === "DRAFT") {
        const payload = {
          ...formData,
          registrationDeadline: formData.registrationDeadline || undefined,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
          tags: formData.tags
            ? formData.tags.split(",").map(t => t.trim())
            : []
        };
        await API.put(`/events/${id}`, payload);
        setMessage("Event updated successfully!");
      } else if (event.status === "PUBLISHED") {
        await API.patch(`/events/${id}`, formData);
        setMessage("Event updated successfully!");
      } else {
        setMessage("Cannot edit events in this status");
        return;
      }

      setTimeout(() => {
        navigate(`/organizer/events/${id}`);
      }, 1500);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to update event");
    }
  };

  const handlePublish = async () => {
    try {
      await API.post(`/events/${id}/publish`);
      setMessage("Event published successfully!");
      setTimeout(() => {
        navigate(`/organizer/events/${id}`);
      }, 1500);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to publish event");
    }
  };

  const handleClose = async () => {
    if (!window.confirm("Are you sure you want to close registrations for this event?")) {
      return;
    }
    try {
      await API.patch(`/events/${id}`, { action: "close" });
      setMessage("Event closed successfully!");
      setTimeout(() => {
        navigate(`/organizer/events/${id}`);
      }, 1500);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to close event");
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await API.patch(`/events/${id}`, { status: newStatus });
      setMessage(`Event status changed to ${newStatus}`);
      setTimeout(() => {
        navigate(`/organizer/events/${id}`);
      }, 1500);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to change status");
    }
  };

  if (loading) return <div className="event-edit-container">Loading...</div>;
  if (!event) return <div className="event-edit-container">Event not found</div>;

  const canEdit = event.status === "DRAFT" || event.status === "PUBLISHED";
  const isDraft = event.status === "DRAFT";
  const isPublished = event.status === "PUBLISHED";
  const isOngoingOrCompleted = event.status === "ONGOING" || event.status === "COMPLETED";

  return (
    <div className="event-edit-container">
      <div className="edit-header">
        <h1>Edit Event: {event.name}</h1>
        <button onClick={() => navigate(`/organizer/events/${id}`)} className="back-btn">
          ← Back
        </button>
      </div>

      <div className="status-info">
        <span className="status-badge">Status: {event.status}</span>
        {hasRegistrations && (
          <span className="warning-badge">
            ⚠️ Form locked - Event has registrations
          </span>
        )}
      </div>

      {message && (
        <div className={`message ${message.includes("Failed") ? "error" : "success"}`}>
          {message}
        </div>
      )}

      {canEdit && (
        <form onSubmit={handleUpdate} className="edit-form">
          {isDraft && (
            <>
              <div className="form-section">
                <h2>Basic Information</h2>
                <label htmlFor="eventName">Event Name *</label>
                <input
                  id="eventName"
                  placeholder="Event Name *"
                  required
                  value={formData.name || ""}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  placeholder="Description *"
                  required
                  rows="4"
                  value={formData.description || ""}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
                <label htmlFor="eligibility">Eligibility</label>
                <input
                  id="eligibility"
                  placeholder="Eligibility"
                  value={formData.eligibility || ""}
                  onChange={e => setFormData({ ...formData, eligibility: e.target.value })}
                />
              </div>

              <div className="form-section">
                <h2>Dates & Limits</h2>
                <label htmlFor="registrationDeadline">Registration Deadline</label>
                <input
                  id="registrationDeadline"
                  type="datetime-local"
                  value={formData.registrationDeadline || ""}
                  onChange={e => setFormData({ ...formData, registrationDeadline: e.target.value })}
                />
                <label htmlFor="startDate">Start Date</label>
                <input
                  id="startDate"
                  type="datetime-local"
                  value={formData.startDate || ""}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                />
                <label htmlFor="endDate">End Date</label>
                <input
                  id="endDate"
                  type="datetime-local"
                  value={formData.endDate || ""}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                />
                <label htmlFor="registrationLimit">Registration Limit (0 for unlimited)</label>
                <input
                  id="registrationLimit"
                  type="number"
                  placeholder="Registration Limit (0 for unlimited)"
                  min="0"
                  value={formData.registrationLimit || 0}
                  onChange={e => setFormData({ ...formData, registrationLimit: Number(e.target.value) })}
                />
                <label htmlFor="registrationFee">Registration Fee (₹)</label>
                <input
                  id="registrationFee"
                  type="number"
                  placeholder="Registration Fee (₹)"
                  min="0"
                  value={formData.registrationFee || 0}
                  onChange={e => setFormData({ ...formData, registrationFee: Number(e.target.value) })}
                />
                <label htmlFor="tags">Tags (comma separated)</label>
                <input
                  id="tags"
                  placeholder="Tags (comma separated)"
                  value={formData.tags || ""}
                  onChange={e => setFormData({ ...formData, tags: e.target.value })}
                />
              </div>

              {event.type === "NORMAL" && !hasRegistrations && (
                <div className="form-section">
                  <h2>Registration Form</h2>
                  <p className="form-help">Form fields can be edited before first registration.</p>
                  {formData.registrationForm?.map((field, index) => (
                    <div key={index} className="form-field-display">
                      <strong>{field.label}</strong> ({field.type})
                      {field.required && <span className="required-badge">Required</span>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {isPublished && (
            <>
              <div className="form-section">
                <h2>Limited Edits (Published Event)</h2>
                <p className="form-help">
                  For published events, you can only update description, extend deadline, and increase limit.
                </p>
                <textarea
                  placeholder="Description"
                  rows="4"
                  value={formData.description || ""}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
                <label>Registration Deadline</label>
                <input
                  type="datetime-local"
                  value={formData.registrationDeadline || ""}
                  onChange={e => setFormData({ ...formData, registrationDeadline: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Registration Limit"
                  min="0"
                  value={formData.registrationLimit || 0}
                  onChange={e => setFormData({ ...formData, registrationLimit: Number(e.target.value) })}
                />
              </div>
            </>
          )}

          <div className="form-actions">
            <button type="submit" className="save-btn">
              Save Changes
            </button>
            {isDraft && (
              <button type="button" onClick={handlePublish} className="publish-btn">
                Publish Event
              </button>
            )}
            {isPublished && (
              <button type="button" onClick={handleClose} className="close-btn">
                Close Registrations
              </button>
            )}
          </div>
        </form>
      )}

      {isOngoingOrCompleted && (
        <div className="status-only-section">
          <h2>Status Management</h2>
          <p>For ongoing/completed events, only status changes are allowed.</p>
          <div className="status-actions">
            {event.status === "ONGOING" && (
              <button
                onClick={() => handleStatusChange("COMPLETED")}
                className="status-btn"
              >
                Mark as Completed
              </button>
            )}
            {(event.status === "ONGOING" || event.status === "COMPLETED") && (
              <button
                onClick={() => handleStatusChange("CLOSED")}
                className="status-btn close-status-btn"
              >
                Close Event
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
