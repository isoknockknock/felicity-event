const formatDate = (date, timezone = "UTC") => {
  const d = new Date(date);
  // Convert to ISO format, preserving timezone info
  return d.toISOString()
    .replace(/[-:]/g, "")
    .split(".")[0] + "Z";
};

const escapeICS = (text) => {
  if (!text) return "";
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
};

exports.generateICS = (event, options = {}) => {
  const {
    timezone = "UTC",
    reminderMinutes = [1440, 60] // 1 day and 1 hour before
  } = options;

  const startDate = formatDate(event.startDate, timezone);
  const endDate = formatDate(event.endDate, timezone);
  const now = formatDate(new Date(), timezone);

  let reminders = "";
  if (Array.isArray(reminderMinutes) && reminderMinutes.length > 0) {
    reminders = reminderMinutes.map(min => `
BEGIN:VALARM
TRIGGER:-PT${min}M
ACTION:DISPLAY
DESCRIPTION:Reminder: ${escapeICS(event.name)}
END:VALARM`).join("");
  }

  return `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Felicity EMS//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${event._id}@felicity
DTSTAMP:${now}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${escapeICS(event.name)}
DESCRIPTION:${escapeICS(event.description || "")}
LOCATION:${escapeICS(event.location || "")}
STATUS:CONFIRMED
SEQUENCE:0${reminders}
END:VEVENT
END:VCALENDAR
`.trim();
};

// Generate Google Calendar URL
exports.generateGoogleCalendarUrl = (event) => {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.name || "",
    dates: `${new Date(event.startDate).toISOString().replace(/[-:]/g, "").split(".")[0]}Z/${new Date(event.endDate).toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    details: event.description || "",
    location: event.location || ""
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

// Generate Outlook Calendar URL
exports.generateOutlookCalendarUrl = (event) => {
  const params = new URLSearchParams({
    subject: event.name || "",
    startdt: new Date(event.startDate).toISOString(),
    enddt: new Date(event.endDate).toISOString(),
    body: event.description || "",
    location: event.location || ""
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};
