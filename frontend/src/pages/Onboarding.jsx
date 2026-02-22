import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "./Onboarding.css";

const availableInterests = [
  "AI",
  "Music",
  "Coding",
  "Robotics",
  "Dance",
  "Gaming",
  "Design",
  "Entrepreneurship"
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [selectedClubs, setSelectedClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await API.get("/organizers").catch(() => ({ data: [] }));
        setOrganizers((res.data || []).filter(o => o.isActive !== false));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleInterest = (interest) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const toggleClub = (clubId) => {
    const id = String(clubId);
    if (selectedClubs.includes(id)) {
      setSelectedClubs(selectedClubs.filter(c => c !== id));
    } else {
      setSelectedClubs([...selectedClubs, id]);
    }
  };

  const savePreferences = async () => {
    try {
      await API.put("/participants/me", {
        interests: selectedInterests,
        followedClubs: selectedClubs,
        onboardingCompleted: true
      });
      navigate("/participant");
    } catch {
      alert("Failed to save preferences");
    }
  };

  const skipOnboarding = async () => {
    try {
      await API.put("/participants/me", {
        interests: [],
        onboardingCompleted: true
      });
      navigate("/participant");
    } catch {
      navigate("/participant");
    }
  };

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div className="container onboarding-container">
      <h2 style={{ marginBottom: "1.5rem", textAlign: "center" }}>
        Set Up Your Preferences
      </h2>
      <p style={{ color: "#6b7280", marginBottom: "2rem", textAlign: "center" }}>
        You can skip and configure these later from your Profile
      </p>

      <div className="onboarding-section">
        <h3>Select Your Interests</h3>
        <div className="interests-grid">
          {availableInterests.map(interest => (
            <div
              key={interest}
              onClick={() => toggleInterest(interest)}
              className={`interest-chip ${selectedInterests.includes(interest) ? "selected" : ""}`}
            >
              {interest}
            </div>
          ))}
        </div>
      </div>

      <div className="onboarding-section">
        <h3>Follow Clubs / Organizers (Optional)</h3>
        {organizers.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No organizers available</p>
        ) : (
          <div className="clubs-list">
            {organizers.map(org => (
              <label key={org._id} className="club-checkbox">
                <input
                  type="checkbox"
                  checked={selectedClubs.includes(String(org._id))}
                  onChange={() => toggleClub(org._id)}
                />
                <div>
                  <strong>{org.name}</strong>
                  {org.category && <span className="club-category">{org.category}</span>}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="onboarding-actions">
        <button className="primary" onClick={savePreferences}>
          Save & Continue
        </button>
        <button className="skip-btn" onClick={skipOnboarding}>
          Skip for Now
        </button>
      </div>
    </div>
  );
}
