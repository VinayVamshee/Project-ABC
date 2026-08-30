import express from "express";
import {
  createContact,
  getContacts,
  getContactById,
  updateContact,
  deleteContact,
  searchContacts,
} from "../controllers/contactController.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Search must be above /:id to avoid matching :id to 'search'
router.get("/search", searchContacts);

router.post("/", createContact);
router.get("/", getContacts);
router.get("/:id", getContactById);
router.patch("/:id", updateContact);
router.patch("/:id/status", deleteContact); // Soft delete / status change
router.delete("/:id", deleteContact); // Actual mapping, could be hard delete or soft delete

export default router;
