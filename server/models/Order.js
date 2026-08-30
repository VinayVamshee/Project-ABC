import mongoose from "mongoose";
import Counter from "./counterModel.js";
import "./BusinessContact.js";
import "./BusinessContact.js";


const orderSchema = new mongoose.Schema({
  orderID: { type: String, unique: true, required: true },

  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "BusinessContact", default: null },
  
  orderFor: { type: String, trim: true },
  orderedTo: { type: String, trim: true },
  orderedAddress: { type: String, trim: true },
  homeDelivery: { type: Boolean, default: false },
  modelImage: { type: String, trim: true },
  
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: "BusinessContact", default: null },
  goldGivenToWorker: { type: Number, default: 0 },
  goldPurity: { type: Number, default: 0 },

  buyingCostPrice: { type: Number, default: 0 },

  // Legacy arrays for migration

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

orderSchema.index({ status: 1, createdAt: -1 });

// Auto-increment orderID like ORD_ID_0000001
orderSchema.pre("validate", async function (next) {
  if (this.isNew && !this.orderID) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { name: "orders" },
        { $inc: { seq: 1 } },
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