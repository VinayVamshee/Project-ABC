import { z } from "zod";
import mongoose from "mongoose";

const objectId = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: "Invalid ObjectId format",
});

export const createOrderSchema = {
  body: z.object({
    inventoryId: objectId.optional(),
    customerId: objectId.optional(),
    orderFor: z.string().optional(),
    orderedTo: z.string().optional(),
    orderedAddress: z.string().optional(),
    homeDelivery: z.boolean().optional(),
    modelImage: z.string().optional(),
    workerId: objectId.optional(),
    goldGivenToWorker: z.number().min(0).optional(),
    goldPurity: z.number().min(0).optional(),
    buyingCostPrice: z.number().min(0).optional(),
    
    // Legacy arrays for transition
    productFields: z.any().optional(),
    orderFields: z.any().optional(),
  }),
};

export const updateOrderSchema = {
  body: createOrderSchema.body.partial(),
};
