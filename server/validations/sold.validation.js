import { z } from "zod";
import mongoose from "mongoose";

const objectId = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: "Invalid ObjectId format",
});

const paymentSchema = z.object({
  amount: z.number().min(0),
  date: z.union([z.string(), z.date()]).optional(),
  mode: z.string().optional(),
  paidBy: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  recordedBy: z.string().optional(),
});

export const createSoldSchema = {
  body: z.object({
    inventoryId: objectId.optional(),
    orderId: objectId.optional(),
    customerId: objectId.optional(),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    sellingPrice: z.number().min(0).optional(),
    discount: z.number().min(0).optional(),
    payments: z.array(paymentSchema).optional(),
    soldAt: z.union([z.string(), z.date()]).optional(),
    
    // Legacy arrays for transition
    productFields: z.any().optional(),
    soldFields: z.any().optional(),
  }),
};

export const createSoldFromOrderSchema = {
  body: createSoldSchema.body,
};

export const addPaymentSchema = {
  body: paymentSchema,
};
