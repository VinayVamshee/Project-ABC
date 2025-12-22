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

const orderSchema = new mongoose.Schema({
  orderID: { type: String, unique: true, required: true },

  buyingCostPrice: {
    type: Number,
    default: 0,
  },

  productFields: { type: [fieldValueSchema], default: [] },
  orderFields: { type: [fieldValueSchema], default: [] },

  status: {
    type: String,
    enum: ["pending", "completed", "cancelled"],
    default: "pending",
  },

  sourceInventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Inventory",
    default: null,
  },
}, { timestamps: true, versionKey: false });

// Auto-increment orderID like ORD_ID_0000001
orderSchema.pre("validate", async function (next) {
  if (this.isNew && !this.orderID) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { name: "orders" },
        { $inc: { seq: 1 } },       // ← use seq, not value
        { new: true, upsert: true }
      );

      const count = counter.seq.toString().padStart(6, "0");
      this.orderID = `ORD_ID_${count}`;
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

export default mongoose.model("Order", orderSchema);