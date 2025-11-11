import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    avatar: {
      type: {
        url: String,
        localPath: String,
      },
      default: {
        url: "https://placehold.co/600x400",
        localPath: "",
      },
    },

    username: { type: String, required: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    fullName: {
      type: String,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
    },

    // New: loyalty points
    points: { type: Number, default: 0 },

    // New: store active refresh tokens for rotation/invalidation
    refreshTokens: [
      {
        token: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    refreshToken: {
      type: String,
    },

    forgotPasswordToken: {
      type: String,
    },

    forgotPasswordExpiry: {
      type: Date,
    },

    emailVerificationToken: {
      type: String,
    },

    emailVerificationExpiry: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

/* ---------------------------------------------------
   🔒 Pre-save: hash password + enforce complexity
--------------------------------------------------- */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  // Enforce strong password
  // const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
  // if (!passwordRegex.test(this.password)) {
  //   const err = new Error(
  //     "Password must be at least 8 characters long and include one number and one symbol",
  //   );
  //   return next(err);
  // }

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

/* ---------------------------------------------------
   ✅ Validate entered password
--------------------------------------------------- */
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

/* ---------------------------------------------------
   🔐 Generate Access Token
--------------------------------------------------- */
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      role: this.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" },
  );
};

/* ---------------------------------------------------
   🔄 Generate Refresh Token
--------------------------------------------------- */
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ _id: this._id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
  });
};

/* ---------------------------------------------------
   🕐 Generate Temporary Token (Email / Password)
--------------------------------------------------- */
userSchema.methods.generateTemporaryToken = function () {
  const unHashedToken = crypto.randomBytes(20).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(unHashedToken)
    .digest("hex");

  const tokenExpiry = Date.now() + 20 * 60 * 1000; // 20 min
  return { unHashedToken, hashedToken, tokenExpiry };
};

/* ---------------------------------------------------
   🧾 Model Export
--------------------------------------------------- */
export const User = mongoose.model("User", userSchema);
