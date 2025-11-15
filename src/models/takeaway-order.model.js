import mongoose from "mongoose";

const takeawayOrderItemSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "Menu", required: true },
  quantity: { type: Number, required: true, default: 1 },
});

const takeawayOrderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [takeawayOrderItemSchema],
    totalAmount: { type: Number, required: true, default: 0 },
    orderStatus: {
      type: String,
      enum: ["Pending", "Preparing", "Ready for Pickup", "Picked Up", "Cancelled"],
      default: "Pending",
    },
    paymentMethod: { type: String, enum: ["Online", "Cash at Shop"], default: "Cash at Shop" },
    paymentStatus: { type: String, enum: ["Pending", "Paid"], default: "Pending" },
    pickupTime: { type: Date }, // estimated pickup time
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const TakeawayOrder = mongoose.model("TakeawayOrder", takeawayOrderSchema);