import { z } from "zod";

const sectionSchema = z.object({
  show: z.boolean().optional(),
  serialNo: z.number().optional(),
}).optional();

export const createInputFieldSchema = {
  body: z.object({
    label: z.string().min(1, "Label is required"),
    key: z.string().min(1, "Key is required").optional(),
    type: z.enum([
        "text", "number", "checkbox", "file", "select", 
        "radio", "textarea", "date", "datetime", "time", 
        "lookup", "currency", "weight", "percentage", 
        "phone", "email"
    ]).optional(),
    numberSubType: z.string().nullable().optional(),
    fileType: z.string().nullable().optional(),
    selectOptions: z.array(
      z.object({
        label: z.string().min(1, "Option label is required"),
      })
    ).optional(),
    config: z.any().optional(),
    validation: z.any().optional(),
    showIn: z.any().optional(),
  }),
};

export const updateInputFieldSchema = {
  body: createInputFieldSchema.body.partial(),
};
