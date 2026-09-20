import express from "express";
import { validateRequest } from "../middleware/validate.middleware.js";
import { createSoldSchema, addPaymentSchema } from "../validations/sold.validation.js";
import {
  createSold,
  getAllSoldItems,
  getSoldItemById,
  addPaymentToSold
} from "../controllers/soldController.js";

const router = express.Router();

router.post("/", validateRequest(createSoldSchema), createSold);
router.get("/", getAllSoldItems);
router.get("/:id", getSoldItemById);
router.post("/:id/payments", validateRequest(addPaymentSchema), addPaymentToSold);
router.post("/:id/payment", validateRequest(addPaymentSchema), addPaymentToSold);

export default router;