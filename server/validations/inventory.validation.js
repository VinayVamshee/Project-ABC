import { z } from "zod";
import mongoose from "mongoose";

const objectId = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: "Invalid ObjectId format",
});

export const createInventoryItemSchema = {
  body: z.object({
    baseCostPrice: z.number({ required_error: "baseCostPrice is required" }).min(0, "Price must be positive"),
    productName: z.string().optional(),
    category: z.string().optional(),
    wholeSellerId: objectId.optional().nullable(),
    quality: z.string().optional(),
    grossWeight: z.number().min(0).optional(),
    netWeight: z.number().min(0).optional(),
    stoneWeight: z.number().min(0).optional(),
    stoneComposition: z.string().optional(),
    designDetails: z.string().optional(),
    productImage: z.string().optional(),
    modelImage: z.string().optional(),
    fields: z.any().optional(), // allow legacy fields payload during transition
  }).passthrough(),
};

export const createBulkInventoryItemsSchema = {
  body: z.object({
    items: z.array(createInventoryItemSchema.body).min(1, "At least one item is required"),
  }),
};

export const updateInventoryItemSchema = {
  body: createInventoryItemSchema.body.partial(),
};
