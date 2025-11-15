import mongoose from "mongoose";

const tableSchema = new mongoose.Schema(
  {
    tableNumber: { type: Number, required: true, unique: true },
    capacity: { type: Number, required: true, default: 4 }, // seats
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Table = mongoose.model("Table", tableSchema);