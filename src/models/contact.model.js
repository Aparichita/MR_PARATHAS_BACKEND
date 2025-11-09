import mongoose, { Schema } from "mongoose";

// Contact Schema
const contactSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },

    phone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, "Please provide a valid 10-digit phone number"],
    },

    subject: {
      type: String,
      trim: true,
      default: "General Inquiry",
    },

    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      minlength: [5, "Message should be at least 5 characters long"],
    },

    status: {
      type: String,
      enum: ["Pending", "In Progress", "Resolved"],
      default: "Pending",
    },

    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: "User", // admin who handled the query
    },
  },
  {
    timestamps: true,
  },
);

// Optional helper: mark as resolved
contactSchema.methods.markResolved = async function (userId) {
  this.status = "Resolved";
  this.respondedBy = userId;
  await this.save();
  return this;
};

const Contact = mongoose.model("Contact", contactSchema);

export default Contact;
