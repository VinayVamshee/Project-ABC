import express from "express";
import {
  createSold,
  getAllSold,
  getSoldById,
  addPaymentToSold,
  createSoldFromOrder
} from "../controllers/soldController.js";

const router = express.Router();

router.post("/", createSold);
router.get("/", getAllSold);
router.get("/:id", getSoldById);
router.post("/:id/payments", addPaymentToSold);
router.post("/order/:id", createSoldFromOrder);

export default router;