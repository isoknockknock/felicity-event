const QRCode = require("qrcode");
const { sendMail } = require("./mailer");

function buildTicketQrPayload({ ticketId, event, participant }) {
  return JSON.stringify({
    ticketId,
    event: {
      id: event?._id?.toString?.() || null,
      name: event?.name || null,
      type: event?.type || null,
      startDate: event?.startDate || null,
      endDate: event?.endDate || null
    },
    participant: {
      id: participant?._id?.toString?.() || null,
      email: participant?.email || null
    }
  });
}

async function sendTicketEmail({ to, participantName, event, ticketId }) {
  const payload = buildTicketQrPayload({
    ticketId,
    event,
    participant: { _id: null, email: to }
  });

  const qrDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 260
  });

  const subject = `Your Ticket for ${event.name}`;
  const text = `Ticket ID: ${ticketId}\nEvent: ${event.name}\nType: ${event.type}`;

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#111">
      <h2 style="margin:0 0 12px 0;">Ticket Confirmation</h2>
      <p style="margin:0 0 12px 0;">Hi ${participantName || "there"},</p>
      <p style="margin:0 0 12px 0;">
        Your ticket for <b>${event.name}</b> (${event.type}) has been generated.
      </p>
      <div style="padding:12px;border:1px solid #e5e7eb;border-radius:10px;display:inline-block;">
        <div style="font-size:12px;color:#6b7280;margin-bottom:8px;">Ticket ID</div>
        <div style="font-size:18px;font-weight:700;margin-bottom:10px;">${ticketId}</div>
        <img src="${qrDataUrl}" alt="Ticket QR" style="display:block;width:260px;height:260px"/>
      </div>
      <p style="margin:12px 0 0 0;font-size:12px;color:#6b7280;">
        Show this QR at check-in. Keep this email for reference.
      </p>
    </div>
  `;

  return await sendMail({ to, subject, html, text });
}

module.exports = { sendTicketEmail, buildTicketQrPayload };

