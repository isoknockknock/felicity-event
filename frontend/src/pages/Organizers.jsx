import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../services/api";
import { AuthContext } from "../context/AuthContext";
import "./Organizers.css";

const Organizers = () => {
  const { role } = useContext(AuthContext);
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [followed, setFollowed] = useState([]);

  useEffect(() => {
    const fetchOrganizers = async () => {
      try {
        const res = await axios.get("/organizers");
        setOrganizers((res.data || []).filter(o => o.isActive !== false));
        if (role === "PARTICIPANT") {
          const me = await axios.get("/participants/me").catch(() => ({ data: null }));
          setFollowed((me.data?.followedClubs || []).map(String));
        } else {
          setFollowed([]);
        }
      } catch (err) {
        setError("Failed to load organizers");
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizers();
  }, [role]);

  const followedSet = useMemo(() => new Set(followed), [followed]);

  const toggleFollow = async (orgId) => {
    if (role !== "PARTICIPANT") return;
    const isFollowing = followedSet.has(String(orgId));
    try {
      if (isFollowing) {
        const res = await axios.post(`/participants/clubs/${orgId}/unfollow`);
        setFollowed((res.data?.followedClubs || []).map(String));
      } else {
        const res = await axios.post(`/participants/clubs/${orgId}/follow`);
        setFollowed((res.data?.followedClubs || []).map(String));
      }
    } catch {
      // ignore for now
    }
  };

  if (loading) return <div className="center">Loading organizers...</div>;
  if (error) return <div className="center error">{error}</div>;

  return (
    <div className="organizers-container">
      <h1 className="page-title">Clubs & Organizers</h1>

      <div className="organizers-grid">
        {organizers.map((org) => (
          <div key={org._id} className="organizer-card">
            <h2>
              <Link to={`/organizers/${org._id}`} style={{ color: "inherit", textDecoration: "none" }}>
                {org.name}
              </Link>
            </h2>
            <span className="category">{org.category}</span>

            <p className="description">
              {org.description || "No description provided."}
            </p>

            <div className="email">
              📧 {org.contactEmail}
            </div>

            {role === "PARTICIPANT" && (
              <button className="follow-btn" onClick={() => toggleFollow(org._id)}>
                {followedSet.has(String(org._id)) ? "Unfollow" : "Follow"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Organizers;
