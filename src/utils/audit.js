import { Audit } from "../models/audit.model.js";

export const logAudit = async ({ user, action, resource, resourceId, meta = {}, ip }) => {
  try {
    await Audit.create({ user, action, resource, resourceId, meta, ip });
  } catch (err) {
    // don't break main flow; log and continue
    console.error("Audit log failed:", err);
  }
};