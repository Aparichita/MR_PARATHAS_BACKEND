import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromEmail = process.env.FROM_EMAIL || process.env.ADMIN_EMAIL;

let transporter = null;

if (smtpUser && smtpPass && smtpHost) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort ? Number(smtpPort) : 587,
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
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
    await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      text,
      html,
    });
    return;
  }

  // Fallback: log email content (useful for local dev without SMTP)
  console.info("=== sendEmail (logged, SMTP not configured) ===");
  console.info("To:", to);
  console.info("Subject:", subject);
  if (text) console.info("Text:", text);
  if (html) console.info("HTML:", html);
  console.info("==============================================");
};