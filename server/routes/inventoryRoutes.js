import express from "express";
import { validateRequest } from "../middleware/validate.middleware.js";
import {
  createInventoryItemSchema,
  createBulkInventoryItemsSchema,
  updateInventoryItemSchema,
} from "../validations/inventory.validation.js";
import {
  createInventoryItem,
  createBulkInventoryItems,
  getAllInventoryItems,
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem,
  getBarcodeImage,
  getQRCodeImage,
  downloadBulkImportTemplate,
} from "../controllers/inventoryController.js";
const router = express.Router();

// Routes
router.get("/template", downloadBulkImportTemplate);
router.post("/bulk", validateRequest(createBulkInventoryItemsSchema), createBulkInventoryItems);
router.post("/", validateRequest(createInventoryItemSchema), createInventoryItem);
router.get("/qrcode/:productID", getQRCodeImage);
router.get("/barcode/:productID", getBarcodeImage);
router.get("/", getAllInventoryItems);
router.get("/:id", getInventoryItemById);
router.put("/:id", validateRequest(updateInventoryItemSchema), updateInventoryItem);
router.delete("/:id", deleteInventoryItem);

export default router;