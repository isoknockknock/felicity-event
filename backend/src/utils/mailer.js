const nodemailer = require("nodemailer");

let cachedTransporter = null;
let cachedMode = null; // 'smtp' | 'ethereal'

async function getTransporter() {
  if (cachedTransporter) return { transporter: cachedTransporter, mode: cachedMode };

  const hasSmtp =
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS;

  if (hasSmtp) {
    cachedMode = "smtp";
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    return { transporter: cachedTransporter, mode: cachedMode };
  }

  const testAccount = await nodemailer.createTestAccount();
  cachedMode = "ethereal";
  cachedTransporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
  return { transporter: cachedTransporter, mode: cachedMode };
}

async function sendMail({ to, subject, html, text }) {
  const { transporter, mode } = await getTransporter();
  const from = process.env.SMTP_FROM || "Felicity EMS <no-reply@felicity.local>";

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html
  });

  const previewUrl =
    mode === "ethereal" ? nodemailer.getTestMessageUrl(info) : null;

  return { messageId: info.messageId, previewUrl, mode };
}

module.exports = { sendMail };

