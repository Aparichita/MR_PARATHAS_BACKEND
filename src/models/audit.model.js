import mongoose from "mongoose";

const auditSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  action: { type: String, required: true },
  resource: { type: String, required: false },
  resourceId: { type: mongoose.Schema.Types.ObjectId, required: false },
  meta: { type: Object, default: {} },
  ip: { type: String },
}, { timestamps: true });

export const Audit = mongoose.model("Audit", auditSchema);