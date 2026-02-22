import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "./EventCreate.css";

export default function EventCreate() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "NORMAL",
    eligibility: "All",
    registrationDeadline: "",
    startDate: "",
    endDate: "",
    registrationLimit: 0,
    registrationFee: 0,
    tags: "",
    isTeamEvent: false,
    teamSize: 2,
    registrationForm: [],
    merchandiseItems: []
  });

  const [loading, setLoading] = useState(false);

  const addFormField = () => {
    setForm({
      ...form,
      registrationForm: [
        ...form.registrationForm,
        { label: "", type: "text", required: false, options: "" }
      ]
    });
  };

  const removeFormField = (index) => {
    const updated = form.registrationForm.filter((_, i) => i !== index);
    setForm({ ...form, registrationForm: updated });
  };

  const updateFormField = (index, key, value) => {
    const updated = [...form.registrationForm];
    updated[index][key] = value;
    setForm({ ...form, registrationForm: updated });
  };

  const moveFormField = (index, direction) => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === form.registrationForm.length - 1)
    ) {
      return;
    }

    const updated = [...form.registrationForm];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setForm({ ...form, registrationForm: updated });
  };

  const addMerchItem = () => {
    setForm({
      ...form,
      merchandiseItems: [
        ...form.merchandiseItems,
        {
          name: "",
          price: 0,
          stock: 0,
          sizeOptions: "",
          colorOptions: "",
          purchaseLimitPerParticipant: 1
        }
      ]
    });
  };

  const updateMerchItem = (index, key, value) => {
    const updated = [...form.merchandiseItems];
    updated[index][key] = value;
    setForm({ ...form, merchandiseItems: updated });
  };

  const removeMerchItem = (index) => {
    const updated = form.merchandiseItems.filter((_, i) => i !== index);
    setForm({ ...form, merchandiseItems: updated });
  };

  const createEvent = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...form,
        registrationDeadline: form.registrationDeadline || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        tags: form.tags
          ? form.tags.split(",").map(t => t.trim())
          : [],
        merchandiseItems: form.merchandiseItems.map(item => ({
          name: item.name,
          price: Number(item.price),
          stock: Number(item.stock),
          sizeOptions: item.sizeOptions
            ? item.sizeOptions.split(",").map(s => s.trim()).filter(Boolean)
            : [],
          colorOptions: item.colorOptions
            ? item.colorOptions.split(",").map(c => c.trim()).filter(Boolean)
            : [],
          purchaseLimitPerParticipant: Number(item.purchaseLimitPerParticipant) || 1
        })),
        registrationForm: form.registrationForm.map(field => ({
          label: field.label,
          type: field.type,
          required: field.required || false,
          options: field.type === "dropdown" && typeof field.options === "string"
            ? field.options.split(",").map(o => o.trim()).filter(Boolean)
            : []
        })),
        isTeamEvent: form.type === "NORMAL" ? Boolean(form.isTeamEvent) : false,
        teamSize: form.type === "NORMAL" && form.isTeamEvent ? Number(form.teamSize || 2) : undefined
      };

      const res = await API.post("/events", payload);
      alert("Event created as draft!");
      navigate(`/organizer/events/${res.data._id}`);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || "Failed to create event";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="event-create-container">
      <div className="event-create-header">
        <h1>Create New Event</h1>
        <button onClick={() => navigate("/organizer")} className="cancel-btn">
          Cancel
        </button>
      </div>

      <form onSubmit={createEvent} className="event-create-form">
        <div className="form-section">
          <h2>Basic Information</h2>
          <label htmlFor="eventName">Event Name *</label>
          <input
            id="eventName"
            placeholder="e.g. Annual Sports Meet"
            required
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            placeholder="Tell participants what your event is about..."
            required
            rows="4"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
          <label htmlFor="eventType">Event Type</label>
          <select
            id="eventType"
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value })}
          >
            <option value="NORMAL">Normal Event</option>
            <option value="MERCHANDISE">Merchandise</option>
          </select>
          <label htmlFor="eligibility">Eligibility</label>
          <input
            id="eligibility"
            placeholder="e.g. All Students, 3rd Year Only"
            value={form.eligibility}
            onChange={e => setForm({ ...form, eligibility: e.target.value })}
          />
        </div>

        <div className="form-section">
          <h2>Dates & Limits</h2>
          <label htmlFor="registrationDeadline">Registration Deadline</label>
          <input
            id="registrationDeadline"
            type="datetime-local"
            value={form.registrationDeadline}
            onChange={e => setForm({ ...form, registrationDeadline: e.target.value })}
          />
          <label htmlFor="startDate">Start Date</label>
          <input
            id="startDate"
            type="datetime-local"
            value={form.startDate}
            onChange={e => setForm({ ...form, startDate: e.target.value })}
          />
          <label htmlFor="endDate">End Date</label>
          <input
            id="endDate"
            type="datetime-local"
            value={form.endDate}
            onChange={e => setForm({ ...form, endDate: e.target.value })}
          />
          <label htmlFor="registrationLimit">Registration Limit (0 for unlimited)</label>
          <input
            id="registrationLimit"
            type="number"
            min="0"
            value={form.registrationLimit}
            onChange={e => setForm({ ...form, registrationLimit: Number(e.target.value) })}
          />
          <label htmlFor="registrationFee">Registration Fee (₹)</label>
          <input
            id="registrationFee"
            type="number"
            min="0"
            value={form.registrationFee}
            onChange={e => setForm({ ...form, registrationFee: Number(e.target.value) })}
          />
          <label htmlFor="tags">Tags (comma separated)</label>
          <input
            id="tags"
            placeholder="sports, tech, cult"
            value={form.tags}
            onChange={e => setForm({ ...form, tags: e.target.value })}
          />
        </div>

        {form.type === "NORMAL" && (
          <div className="form-section">
            <h2>Team Settings (Optional)</h2>
            <label className="checkbox-label" style={{ marginBottom: 10 }}>
              <input
                type="checkbox"
                checked={Boolean(form.isTeamEvent)}
                onChange={(e) =>
                  setForm({ ...form, isTeamEvent: e.target.checked })
                }
              />
              Team-based registrations
            </label>
            {form.isTeamEvent && (
              <>
                <label htmlFor="teamSize">Team Size</label>
                <input
                  id="teamSize"
                  type="number"
                  min="2"
                  placeholder="e.g., 2"
                  value={form.teamSize}
                  onChange={(e) =>
                    setForm({ ...form, teamSize: Number(e.target.value) })
                  }
                />
                <p className="form-help-text">
                  Participants must enter a Team Code while registering. “Team completion” counts how many teams reach the configured size.
                </p>
              </>
            )}

            <h2>Custom Registration Form</h2>
            <p className="form-help-text">
              Add custom fields for event registration. Forms will be locked after the first registration.
            </p>
            {form.registrationForm.map((field, index) => (
              <div key={index} className="form-field-builder">
                <div className="field-controls">
                  <button
                    type="button"
                    onClick={() => moveFormField(index, "up")}
                    disabled={index === 0}
                    className="move-btn"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveFormField(index, "down")}
                    disabled={index === form.registrationForm.length - 1}
                    className="move-btn"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFormField(index)}
                    className="remove-field-btn"
                  >
                    Remove
                  </button>
                </div>
                <label>Field Label</label>
                <input
                  placeholder="e.g. T-Shirt Size"
                  value={field.label}
                  onChange={e => updateFormField(index, "label", e.target.value)}
                />
                <label>Field Type</label>
                <select
                  value={field.type}
                  onChange={e => updateFormField(index, "type", e.target.value)}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="email">Email</option>
                  <option value="dropdown">Dropdown</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="file">File Upload</option>
                </select>
                {field.type === "dropdown" && (
                  <>
                    <label>Options (comma separated)</label>
                    <input
                      placeholder="e.g. Small, Medium, Large"
                      value={field.options || ""}
                      onChange={e => updateFormField(index, "options", e.target.value)}
                    />
                  </>
                )}
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={field.required || false}
                    onChange={e => updateFormField(index, "required", e.target.checked)}
                  />
                  Required Field
                </label>
              </div>
            ))}
            <button type="button" onClick={addFormField} className="add-field-btn">
              + Add Form Field
            </button>
          </div>
        )}

        {form.type === "MERCHANDISE" && (
          <div className="form-section">
            <h2>Merchandise Items</h2>
            {form.merchandiseItems.map((item, index) => (
              <div key={index} className="merch-item-builder">
                <label>Item Name</label>
                <input
                  placeholder="e.g. Felicity T-Shirt"
                  value={item.name || ""}
                  onChange={e => updateMerchItem(index, "name", e.target.value)}
                />
                <label>Price (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={item.price || 0}
                  onChange={e => updateMerchItem(index, "price", Number(e.target.value))}
                />
                <label>Stock</label>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={item.stock || 0}
                  onChange={e => updateMerchItem(index, "stock", Number(e.target.value))}
                />
                <label>Size Options (comma separated)</label>
                <input
                  placeholder="e.g. S, M, L, XL"
                  value={item.sizeOptions || ""}
                  onChange={e => updateMerchItem(index, "sizeOptions", e.target.value)}
                />
                <label>Color Options (comma separated)</label>
                <input
                  placeholder="e.g. Red, Blue, Black"
                  value={item.colorOptions || ""}
                  onChange={e => updateMerchItem(index, "colorOptions", e.target.value)}
                />
                <label>Purchase Limit Per Participant</label>
                <input
                  type="number"
                  placeholder="1"
                  min="1"
                  value={item.purchaseLimitPerParticipant || 1}
                  onChange={e => updateMerchItem(index, "purchaseLimitPerParticipant", Number(e.target.value))}
                />
                <button
                  type="button"
                  onClick={() => removeMerchItem(index)}
                  className="remove-item-btn"
                >
                  Remove Item
                </button>
              </div>
            ))}
            <button type="button" onClick={addMerchItem} className="add-item-btn">
              + Add Merchandise Item
            </button>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="create-btn" disabled={loading}>
            {loading ? "Creating..." : "Create Event (Draft)"}
          </button>
        </div>
      </form>
    </div>
  );
}
