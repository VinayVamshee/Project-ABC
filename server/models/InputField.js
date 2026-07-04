import mongoose from "mongoose";

// Overview details (whether shown in overview + serial)
const overviewSchema = new mongoose.Schema({
  show: { type: Boolean, default: false },
  serialNo: { type: Number },
});

// Configuration for where the field is displayed
const sectionSchema = new mongoose.Schema({
  show: { type: Boolean, default: false },
  serialNo: { type: Number },
  overview: { type: overviewSchema, default: () => ({}) },
});

// Each option in a select-type input field will have its own ObjectId
const selectOptionSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
  label: { type: String, required: true, trim: true },
});

// Main InputField schema
const inputFieldSchema = new mongoose.Schema(
  {
    // Display label of the field
    label: {
      type: String,
      required: true,
      trim: true,
      unique: true, // only one unique field name allowed
    },

    // Field type (text, number, checkbox, file, select)
    type: {
      type: String,
      enum: ["text", "number", "checkbox", "file", "select"],
      default: "text",
    },

    // For number fields
    numberSubType: {
      type: String,
      enum: ["currency", "weight", "phone", "plain", null],
      default: null,
    },

    // For file fields
    fileType: {
      type: String,
      enum: ["image", "pdf", null],
      default: null,
    },

    // For select fields (dropdowns)
    selectOptions: {
      type: [selectOptionSchema],
      default: [],
    },

    // Where to show (inventory, orders, sold)
    showIn: {
      inventory: { type: sectionSchema, default: () => ({}) },
      orders: { type: sectionSchema, default: () => ({}) },
      sold: { type: sectionSchema, default: () => ({}) },
    },

    // Whether the field is active (can hide without deleting)
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // createdAt & updatedAt auto-managed
    versionKey: false,
  }
);

export default mongoose.model("InputField", inputFieldSchema);
