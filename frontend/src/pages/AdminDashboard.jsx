import { useEffect, useState } from "react";
import API from "../services/api";

export default function AdminDashboard() {
  const [organizers, setOrganizers] = useState([]);

  useEffect(() => {
    API.get("/admin/organizers")
      .then(res => setOrganizers(res.data));
  }, []);

  return (
    <div>
      <h2>Organizers</h2>
      {organizers.map(o => (
        <div key={o._id}>
          <p>{o.name} - {o.email}</p>
        </div>
      ))}
    </div>
  );
}
