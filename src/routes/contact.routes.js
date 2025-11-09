import { Router } from "express";
import {
  submitContactForm,
  getAllMessages,
  getSingleMessage,
  deleteMessage,
} from "../controllers/contact.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import { contactFormValidator } from "../validators/index.js";
import { checkAdminRole } from "../middlewares/role.middleware.js";

const router = Router();

/* ---------- Public Route ---------- */
// For customers to submit the "Contact Us" form
router.post("/", contactFormValidator(), validate, submitContactForm);

/* ---------- Protected Admin Routes ---------- */
// Only admin should be able to see messages
router.get("/", verifyJWT, checkAdminRole, getAllMessages);
router.get("/:id", verifyJWT, checkAdminRole, getSingleMessage);
router.delete("/:id", verifyJWT, checkAdminRole, deleteMessage);

export default router;
