import nodemailer from "nodemailer";

const gmailUser = process.env.GMAIL_USER;
const gmailPass = process.env.GMAIL_PASS; // app password recommended
const smtpHost = process.env.SMTP_HOST || process.env.MAILTRAP_SMTP_HOST;
const smtpPort = process.env.SMTP_PORT || process.env.MAILTRAP_SMTP_PORT;
const smtpUser = process.env.SMTP_USER || process.env.MAILTRAP_SMTP_USER;
const smtpPass = process.env.SMTP_PASS || process.env.MAILTRAP_SMTP_PASS;
const fromEmail = process.env.FROM_EMAIL || process.env.ADMIN_EMAIL || gmailUser || "no-reply@mrparathas.com";

let transporter = null;

if (gmailUser && gmailPass) {
  // Use Gmail SMTP with app password (recommended) or OAuth2 (not implemented here)
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });
} else if (smtpHost && smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort ? Number(smtpPort) : 587,
    secure: Number(smtpPort) === 465, // true for 465, false for others
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
} else {
  // No SMTP configured — keep transporter null (emails will be logged)
  transporter = null;
}

/**
 * sendEmail(options)
 * options: { to, subject, text, html }
 * If SMTP not configured, will log the email to console (dev mode).
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) {
    console.warn("sendEmail called without recipient");
    return;
  }

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: fromEmail,
        to,
        subject,
        text,
        html,
      });
      console.info(`Email sent to ${to} (${subject}) — messageId: ${info.messageId}`);
      return info;
    } catch (err) {
      console.error("Error sending email:", err);
      throw err;
    }
  }

  // Fallback: log email content (dev)
  console.info("=== sendEmail (logged, SMTP not configured) ===");
  console.info("From:", fromEmail);
  console.info("To:", to);
  console.info("Subject:", subject);
  if (text) console.info("Text:", text);
  if (html) console.info("HTML:", html);
  console.info("==============================================");
  return null;
};