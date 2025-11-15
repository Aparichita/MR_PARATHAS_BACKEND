import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import {
  getAvailableTables,
  getAllTables,
  createTable,
  updateTable,
  deleteTable,
  bookTable,
  getUserBookings,
  getAllBookings,
  cancelBooking,
  getBookingById,
} from "../controllers/table.controller.js";

const router = Router();

// public: view available tables
router.get("/available", getAvailableTables);

// admin: manage tables
router.get("/", verifyJWT, authorizeRoles("admin"), getAllTables);
router.post("/", verifyJWT, authorizeRoles("admin"), createTable);
router.put("/:id", verifyJWT, authorizeRoles("admin"), updateTable);
router.delete("/:id", verifyJWT, authorizeRoles("admin"), deleteTable);

// bookings
router.post("/bookings/create", verifyJWT, bookTable);
router.get("/bookings/me", verifyJWT, getUserBookings);
router.get("/bookings/:id", verifyJWT, getBookingById);
router.delete("/bookings/:id/cancel", verifyJWT, cancelBooking);

// admin: view all bookings
router.get("/bookings", verifyJWT, authorizeRoles("admin"), getAllBookings);

export default router;