import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import Fuse from "fuse.js";
import { AuthContext } from "../context/AuthContext";
import "./EventList.css";

export default function EventList() {
  const { role } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [trending, setTrending] = useState([]);
  const [followedClubs, setFollowedClubs] = useState([]);
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [eligibilityFilter, setEligibilityFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [scope, setScope] = useState("ALL"); // ALL | FOLLOWED

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [eventsRes, trendingRes] = await Promise.all([
          API.get("/events").catch(() => ({ data: [] })),
          API.get("/events/trending").catch(() => ({ data: [] }))
        ]);
        setEvents(eventsRes.data || []);
        setTrending(trendingRes.data || []);

        if (role === "PARTICIPANT") {
          const me = await API.get("/participants/me").catch(() => ({ data: null }));
          setFollowedClubs(me.data?.followedClubs || []);
          setInterests(me.data?.interests || []);
        } else {
          setFollowedClubs([]);
          setInterests([]);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [role]);

  const eligibilityOptions = useMemo(() => {
    const s = new Set();
    events.forEach(e => {
      if (e.eligibility) s.add(e.eligibility);
    });
    return ["ALL", ...Array.from(s)];
  }, [events]);

  const fuse = useMemo(() => {
    return new Fuse(events, {
      keys: ["name", "organizer.name"],
      threshold: 0.35,
      ignoreLocation: true,
      minMatchCharLength: 2
    });
  }, [events]);

  const filteredEvents = useMemo(() => {
    let list = events;

    if (scope === "FOLLOWED" && role === "PARTICIPANT" && followedClubs.length > 0) {
      const set = new Set(followedClubs.map(id => id.toString()));
      list = list.filter(e => set.has(e.organizer?._id?.toString()));
    }

    if (typeFilter !== "ALL") {
      list = list.filter(e => e.type === typeFilter);
    }

    if (eligibilityFilter !== "ALL") {
      list = list.filter(e => e.eligibility === eligibilityFilter);
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      list = list.filter(e => e.startDate ? new Date(e.startDate) >= from : true);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      list = list.filter(e => e.startDate ? new Date(e.startDate) <= to : true);
    }

    if (query.trim().length >= 2) {
      const res = fuse.search(query.trim());
      const matched = new Set(res.map(r => r.item._id));
      list = list.filter(e => matched.has(e._id));
    } else if (query.trim().length > 0) {
      const q = query.trim().toLowerCase();
      list = list.filter(e =>
        (e.name || "").toLowerCase().includes(q) ||
        (e.organizer?.name || "").toLowerCase().includes(q)
      );
    }

    // Preference-based ordering (only for participants when no explicit filters)
    if (role === "PARTICIPANT" && scope === "ALL" && !query.trim() && typeFilter === "ALL") {
      const followedSet = new Set(followedClubs.map(id => id.toString()));
      const interestsSet = new Set(interests.map(i => i.toLowerCase()));

      list = list.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;

        // Prioritize followed clubs
        if (followedSet.has(a.organizer?._id?.toString())) scoreA += 10;
        if (followedSet.has(b.organizer?._id?.toString())) scoreB += 10;

        // Prioritize events with matching tags/interests
        if (a.tags && Array.isArray(a.tags)) {
          const matchingTags = a.tags.filter(t => interestsSet.has(String(t).toLowerCase())).length;
          scoreA += matchingTags * 5;
        }
        if (b.tags && Array.isArray(b.tags)) {
          const matchingTags = b.tags.filter(t => interestsSet.has(String(t).toLowerCase())).length;
          scoreB += matchingTags * 5;
        }

        // If scores are equal, sort by date (upcoming first)
        if (scoreA === scoreB) {
          const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
          const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
          return dateA - dateB;
        }

        return scoreB - scoreA;
      });
    }

    return list;
  }, [
    events,
    fuse,
    query,
    typeFilter,
    eligibilityFilter,
    dateFrom,
    dateTo,
    scope,
    role,
    followedClubs,
    interests
  ]);

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <div className="browse-header">
        <h2>Browse Events</h2>
        <div className="browse-sub">Search, filter, and discover trending events.</div>
      </div>

      <div className="browse-controls">
        <input
          className="browse-search"
          placeholder="Search events or organizers..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="ALL">All Types</option>
          <option value="NORMAL">Normal</option>
          <option value="MERCHANDISE">Merchandise</option>
        </select>
        <select value={eligibilityFilter} onChange={(e) => setEligibilityFilter(e.target.value)}>
          {eligibilityOptions.map(opt => (
            <option key={opt} value={opt}>
              {opt === "ALL" ? "All Eligibility" : opt}
            </option>
          ))}
        </select>
        <div className="date-range">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span className="muted">to</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>

        {role === "PARTICIPANT" && (
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="ALL">All Events</option>
            <option value="FOLLOWED">Followed Clubs</option>
          </select>
        )}
      </div>

      <div className="section">
        <div className="section-head">
          <h3>Trending (Top 5 / 24h)</h3>
        </div>
        {trending.length === 0 ? (
          <div className="empty">No trending data yet.</div>
        ) : (
          <div className="cards-grid">
            {trending.map((e) => (
              <div key={e._id} className="card">
                <div className="card-title">{e.name}</div>
                <div className="card-meta">
                  <span><b>Organizer:</b> {e.organizer?.name || "—"}</span>
                  <span><b>Type:</b> {e.type}</span>
                  <span><b>24h regs:</b> {e.registrations24h}</span>
                </div>
                <Link to={`/events/${e._id}`}>
                  <button className="primary">View Details</button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section">
        <div className="section-head">
          <h3>All Events</h3>
          <div className="muted">{filteredEvents.length} results</div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="empty">No events match your search/filters.</div>
        ) : (
          <div className="cards-grid">
            {filteredEvents.map((e) => (
              <div key={e._id} className="card">
                <div className="card-title">{e.name}</div>
                <div className="card-desc">{e.description}</div>
                <div className="card-meta">
                  <span><b>Organizer:</b> {e.organizer?.name || "—"}</span>
                  <span><b>Type:</b> {e.type}</span>
                  {e.startDate && (
                    <span><b>Start:</b> {new Date(e.startDate).toLocaleString()}</span>
                  )}
                </div>
                <Link to={`/events/${e._id}`}>
                  <button className="primary">View Details</button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
