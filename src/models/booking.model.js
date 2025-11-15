import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    table: { type: mongoose.Schema.Types.ObjectId, ref: "Table", required: true },
    bookingDate: { type: Date, required: true }, // date + time of booking
    numberOfGuests: { type: Number, required: true, min: 1 },
    specialRequests: { type: String, default: "" },
    bookingStatus: { type: String, enum: ["Confirmed", "Cancelled"], default: "Confirmed" },
    confirmationEmail: { type: String }, // email sent to
  },
  { timestamps: true }
);

export const Booking = mongoose.model("Booking", bookingSchema);