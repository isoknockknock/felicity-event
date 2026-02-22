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
      if (form.startDate && form.endDate && new Date(form.startDate) >= new Date(form.endDate)) {
        alert("Event End Date must be after Start Date");
        setLoading(false);
        return;
      }
      if (form.registrationDeadline && form.startDate && new Date(form.registrationDeadline) > new Date(form.startDate)) {
        alert("Registration Deadline must be before Event Start Date");
        setLoading(false);
        return;
      }

      const payload = {
        ...form,
        registrationDeadline: form.registrationDeadline || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        tags: form.tags
          ? form.tags.split(",").map(t => t.trim()).filter(Boolean)
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
      alert("Event launched successfully!");
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
        <h1>New Event</h1>
        <button onClick={() => navigate("/organizer")} className="secondary">
          Cancel
        </button>
      </div>

      <form onSubmit={createEvent} className="event-create-form">
        {/* Section 1: Core Details */}
        <div className="form-section premium-card">
          <h2>Essential Details</h2>
          <div className="section-grid">
            <div className="input-group">
              <label>Event Title</label>
              <input
                placeholder="Ex: Spring Fest 2026"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label>Description</label>
              <textarea
                placeholder="Capture their attention with a great description..."
                required
                rows="4"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="section-row">
              <div className="input-group">
                <label>Category</label>
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                >
                  <option value="NORMAL">Standard Event</option>
                  <option value="MERCHANDISE">Merchandise Only</option>
                </select>
              </div>
              <div className="input-group">
                <label>Eligibility</label>
                <input
                  placeholder="Ex: All Students"
                  value={form.eligibility}
                  onChange={e => setForm({ ...form, eligibility: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Scheduling */}
        <div className="form-section premium-card">
          <h2>Time & Logistics</h2>
          <div className="section-grid">
            <div className="input-group">
              <label>Registration Closes</label>
              <input
                type="datetime-local"
                value={form.registrationDeadline}
                onChange={e => setForm({ ...form, registrationDeadline: e.target.value })}
              />
            </div>
            <div className="section-row">
              <div className="input-group">
                <label>Event Starts</label>
                <input
                  type="datetime-local"
                  value={form.startDate}
                  onChange={e => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label>Event Ends</label>
                <input
                  type="datetime-local"
                  required
                  value={form.endDate}
                  onChange={e => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="section-row">
              <div className="input-group">
                <label>Entry Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={form.registrationFee}
                  onChange={e => setForm({ ...form, registrationFee: Number(e.target.value) })}
                />
              </div>
              <div className="input-group">
                <label>Participant Cap</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0 for unlimited"
                  value={form.registrationLimit}
                  onChange={e => setForm({ ...form, registrationLimit: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="input-group">
              <label>Search Meta Tags</label>
              <input
                placeholder="Ex: tech, sports, cultural (comma separated)"
                value={form.tags}
                onChange={e => setForm({ ...form, tags: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Customization (Normal Events Only) */}
        {form.type === "NORMAL" && (
          <div className="form-section premium-card">
            <h2>Registration Rules</h2>
            <div className="section-grid">
              <label className="checkbox-card">
                <input
                  type="checkbox"
                  checked={Boolean(form.isTeamEvent)}
                  onChange={(e) => setForm({ ...form, isTeamEvent: e.target.checked })}
                  style={{ width: "auto", marginRight: "1rem" }}
                />
                <b>Enable Team Registrations</b>
              </label>
              {form.isTeamEvent && (
                <div className="input-group" style={{ paddingLeft: "2.5rem" }}>
                  <label>Required Team Size</label>
                  <input
                    type="number"
                    min="2"
                    style={{ maxWidth: "120px" }}
                    value={form.teamSize}
                    onChange={(e) => setForm({ ...form, teamSize: Number(e.target.value) })}
                  />
                </div>
              )}

              <div style={{ marginTop: "1rem" }}>
                <h3 style={{ fontSize: "0.875rem", marginBottom: "1.5rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Custom Data Questionnaire</h3>
                <div className="builder-area">
                  {form.registrationForm.map((field, index) => (
                    <div key={index} className="form-field-builder">
                      <div className="builder-controls">
                        <button type="button" className="builder-icon-btn" onClick={() => moveFormField(index, "up")} disabled={index === 0}>↑</button>
                        <button type="button" className="builder-icon-btn" onClick={() => moveFormField(index, "down")} disabled={index === form.registrationForm.length - 1}>↓</button>
                        <button type="button" className="builder-icon-btn delete" onClick={() => removeFormField(index)}>×</button>
                      </div>
                      <div className="section-grid" style={{ maxWidth: "100%" }}>
                        <div className="section-row">
                          <div className="input-group">
                            <label>Field Name</label>
                            <input
                              placeholder="Ex: Roll Number"
                              value={field.label}
                              onChange={e => updateFormField(index, "label", e.target.value)}
                            />
                          </div>
                          <div className="input-group">
                            <label>Field Type</label>
                            <select
                              value={field.type}
                              onChange={e => updateFormField(index, "type", e.target.value)}
                            >
                              <option value="text">Textual</option>
                              <option value="number">Numeric</option>
                              <option value="dropdown">Selection</option>
                              <option value="checkbox">Toggle</option>
                              <option value="file">File Upload</option>
                            </select>
                          </div>
                        </div>
                        {field.type === "dropdown" && (
                          <div className="input-group">
                            <label>Menu Options (comma separated)</label>
                            <input
                              placeholder="Red, Blue, Green"
                              value={field.options || ""}
                              onChange={e => updateFormField(index, "options", e.target.value)}
                            />
                          </div>
                        )}
                        <label className="checkbox-card">
                          <input
                            type="checkbox"
                            checked={field.required || false}
                            onChange={e => updateFormField(index, "required", e.target.checked)}
                            style={{ width: "auto", marginRight: "1rem" }}
                          />
                          Mark as Mandatory
                        </label>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addFormField} className="add-block-btn">
                    <span>+</span> Add Custom Question
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Merchandise (Store Events Only) */}
        {form.type === "MERCHANDISE" && (
          <div className="form-section premium-card">
            <h2>Inventory & Pricing</h2>
            <div className="builder-area">
              {form.merchandiseItems.map((item, index) => (
                <div key={index} className="merch-item-builder">
                  <div className="builder-controls">
                    <button type="button" className="builder-icon-btn delete" onClick={() => removeMerchItem(index)}>×</button>
                  </div>
                  <div className="section-grid" style={{ maxWidth: "100%" }}>
                    <div className="input-group">
                      <label>Product Name</label>
                      <input
                        placeholder="Ex: Limited Edition Hoodie"
                        value={item.name || ""}
                        onChange={e => updateMerchItem(index, "name", e.target.value)}
                      />
                    </div>
                    <div className="section-row">
                      <div className="input-group">
                        <label>Price (₹)</label>
                        <input
                          type="number"
                          value={item.price || 0}
                          onChange={e => updateMerchItem(index, "price", Number(e.target.value))}
                        />
                      </div>
                      <div className="input-group">
                        <label>Stock Available</label>
                        <input
                          type="number"
                          value={item.stock || 0}
                          onChange={e => updateMerchItem(index, "stock", Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="section-row">
                      <div className="input-group">
                        <label>Sizes</label>
                        <input
                          placeholder="S, M, L"
                          value={item.sizeOptions || ""}
                          onChange={e => updateMerchItem(index, "sizeOptions", e.target.value)}
                        />
                      </div>
                      <div className="input-group">
                        <label>Colors</label>
                        <input
                          placeholder="Black, Navy"
                          value={item.colorOptions || ""}
                          onChange={e => updateMerchItem(index, "colorOptions", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addMerchItem} className="add-block-btn">
                <span>+</span> Add Product to Store
              </button>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="primary lg" disabled={loading}>
            {loading ? "Publishing..." : "Launch Event"}
          </button>
        </div>
      </form>
    </div>
  );
}
