import express from "express";
import { validateRequest } from "../middleware/validate.middleware.js";
import { createOrderSchema, updateOrderSchema } from "../validations/order.validation.js";
import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  // sellOrder
} from "../controllers/orderController.js";

const router = express.Router();

router.post("/", validateRequest(createOrderSchema), createOrder);
router.get("/", getAllOrders);
router.get("/:id", getOrderById);
router.put("/:id", validateRequest(updateOrderSchema), updateOrder);
router.delete("/:id", deleteOrder);
// router.post("/:id/sell", sellOrder);
export default router;