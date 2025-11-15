import mongoose from "mongoose";

const takeawayCartItemSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "Menu", required: true },
  quantity: { type: Number, required: true, default: 1, min: 1 },
});

const takeawayCartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: [takeawayCartItemSchema],
  },
  { timestamps: true }
);

export const TakeawayCart = mongoose.model("TakeawayCart", takeawayCartSchema);