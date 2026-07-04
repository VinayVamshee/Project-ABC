import mongoose from "mongoose";
import Counter from "./counterModel.js";

const fieldValueSchema = new mongoose.Schema(
  {
    fieldRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InputField",
      required: true,
    },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const inventorySchema = new mongoose.Schema(
  {
    productID: { type: String, required: true, unique: true },

    // 🆕 Static Cost Price (must exist)
    baseCostPrice: { type: Number, required: true },

    fields: [fieldValueSchema],
    inStock: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// ✅ Auto-generate productID safely
inventorySchema.pre("validate", async function (next) {
  if (this.isNew && !this.productID) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { name: "inventory" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      const nextNumber = counter.seq.toString().padStart(4, "0");
      this.productID = `PRD_${nextNumber}`;
      console.log("✅ Product ID generated:", this.productID);
      next();
    } catch (err) {
      console.error("❌ Error generating ProductID:", err);
      next(err);
    }
  } else {
    next();
  }
});

export default mongoose.model("Inventory", inventorySchema);