import express from "express";
import {
  createInputField,
  getAllInputFields,
  updateInputField,   // ✅ new controller
  updateSelectOptions,
  deleteInputField,
} from "../controllers/inputFieldController.js";

const router = express.Router();

// POST - Create
router.post("/", createInputField);

// GET - Get all
router.get("/", getAllInputFields);

// ✅ PUT - Update full input field
router.put("/:id", updateInputField);

// PATCH - Update select options
router.patch("/:fieldId/options", updateSelectOptions);

// DELETE - Remove
router.delete("/:id", deleteInputField);

export default router;
