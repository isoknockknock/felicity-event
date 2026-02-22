import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../services/api";
import QRCode from "qrcode";
import "./TicketDetails.css";

export default function TicketDetails() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [qr, setQr] = useState("");
  const [loading, setLoading] = useState(true);

  const payload = useMemo(() => {
    if (!ticket) return "";
    return JSON.stringify({
      ticketId: ticket.ticketId,
      event: {
        id: ticket.event?._id,
        name: ticket.event?.name,
        type: ticket.event?.type,
        startDate: ticket.event?.startDate,
        endDate: ticket.event?.endDate
      },
      participant: {
        email: ticket.participant?.email
      }
    });
  }, [ticket]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/participants/tickets/${ticketId}`);
        setTicket(res.data);
      } catch {
        setTicket(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [ticketId]);

  useEffect(() => {
    const buildQr = async () => {
      if (!payload) return;
      const url = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 280
      });
      setQr(url);
    };
    buildQr();
  }, [payload]);

  if (loading) return <div className="container">Loading...</div>;
  if (!ticket) return <div className="container">Ticket not found.</div>;

  return (
    <div className="container ticket-page">
      <div className="ticket-head">
        <Link to="/participant" className="back-link">← Back to Dashboard</Link>
      </div>

      <div className="ticket-card">
        <div className="ticket-top">
          <h1>Ticket</h1>
          <div className="ticket-id">ID: {ticket.ticketId}</div>
        </div>

        <div className="ticket-grid">
          <div className="ticket-info">
            <div className="row"><b>Event:</b> {ticket.event?.name}</div>
            <div className="row"><b>Type:</b> {ticket.event?.type}</div>
            <div className="row"><b>Organizer:</b> {ticket.event?.organizer?.name || "—"}</div>
            {ticket.event?.startDate && (
              <div className="row"><b>Start:</b> {new Date(ticket.event.startDate).toLocaleString()}</div>
            )}
            {ticket.event?.endDate && (
              <div className="row"><b>End:</b> {new Date(ticket.event.endDate).toLocaleString()}</div>
            )}
            <div className="row"><b>Participant:</b> {ticket.participant?.email || "—"}</div>
            <div style={{ marginTop: 12 }}>
              <Link to={`/events/${ticket.event?._id}`} className="event-link">
                View Event →
              </Link>
            </div>
          </div>

          <div className="ticket-qr">
            {qr ? <img src={qr} alt="Ticket QR" /> : <div>Generating QR…</div>}
            <div className="qr-caption">Show this QR at check-in</div>
          </div>
        </div>
      </div>
    </div>
  );
}

