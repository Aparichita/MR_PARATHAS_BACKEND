import Contact from "../models/contact.model.js"; // default import (fixed)
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import logger from "../utils/logger.js";
import { sendEmail } from "../utils/email.js"; // added
import { logAudit } from "../utils/audit.js";

/* ---------------------------------------------------
   📨 Submit a contact form (Public route)
--------------------------------------------------- */
export const submitContactForm = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    throw new ApiError(
      400,
      "All fields (name, email, subject, message) are required",
    );
  }

  const newContact = await Contact.create({ name, email, subject, message });

  // Notify admin about new contact message
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: `New Contact Message from ${name}`,
        text: `New message:\nFrom: ${name} <${email}>\nSubject: ${subject}\n\n${message}`,
        html: `<p><strong>From:</strong> ${name} &lt;${email}&gt;</p><p><strong>Subject:</strong> ${subject}</p><p>${message}</p>`,
      });
    } else {
      logger.warn("ADMIN_EMAIL not configured — contact notifications disabled");
    }
  } catch (err) {
    logger.error("Failed to send contact notification to admin:", err);
  }

  // Log the audit trail
  await logAudit({
    user: null,
    action: "contact_submitted",
    resource: "contact",
    resourceId: newContact._id,
    meta: { name, email, subject },
    ip: req.ip,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, newContact, "Message submitted successfully"));
});

/* ---------------------------------------------------
   📋 Get all contact messages (Admin only)
--------------------------------------------------- */
export const getAllMessages = asyncHandler(async (req, res) => {
  const contacts = await Contact.find().sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, contacts, "Fetched all contact messages"));
});

/* ---------------------------------------------------
   🔍 Get a single contact message by ID (Admin only)
--------------------------------------------------- */
export const getSingleMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const contact = await Contact.findById(id);
  if (!contact) throw new ApiError(404, "Contact message not found");

  return res
    .status(200)
    .json(
      new ApiResponse(200, contact, "Fetched contact message successfully"),
    );
});

/* ---------------------------------------------------
   💬 Reply to a contact message (Admin only)
--------------------------------------------------- */
export const replyToContact = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { replyMessage } = req.body;

  if (!replyMessage) throw new ApiError(400, "Reply message is required");

  const contact = await Contact.findById(id);
  if (!contact) throw new ApiError(404, "Contact message not found");

  // Optional: send reply email if sendEmail is configured
  // await sendEmail({ ... });

  contact.isReplied = true;
  contact.replyMessage = replyMessage;
  contact.repliedAt = new Date();
  await contact.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, contact, "Reply sent successfully"));
});

/* ---------------------------------------------------
   ❌ Delete a contact message (Admin only)
--------------------------------------------------- */
export const deleteMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deleted = await Contact.findByIdAndDelete(id);
  if (!deleted) throw new ApiError(404, "Contact message not found");

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Contact message deleted successfully"));
});
