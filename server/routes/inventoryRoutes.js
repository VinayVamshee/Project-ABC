import express from "express";
import {
  createInventoryItem,
  getAllInventoryItems,
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem,
} from "../controllers/inventoryController.js";

const router = express.Router();

// Routes
router.post("/", createInventoryItem);
router.get("/", getAllInventoryItems);
router.get("/:id", getInventoryItemById);
router.put("/:id", updateInventoryItem);
router.delete("/:id", deleteInventoryItem);

export default router;