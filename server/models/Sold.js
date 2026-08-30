import mongoose from "mongoose";
import Counter from "./counterModel.js";
import "./Inventory.js";
import "./BusinessContact.js";

/* ---------------- PAYMENT ---------------- */
const paymentSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    mode: { type: String, default: "cash" },
    paidBy: { type: String, default: "customer" },
    reference: { type: String, default: "" },
    notes: { type: String, default: "" },
    recordedBy: { type: String, default: "" },
  },
  { _id: true }
);

/* ---------------- FIELD VALUE ---------------- */

/* ---------------- SOLD ---------------- */
const soldSchema = new mongoose.Schema(
  {
    billingID: { type: String, required: true, unique: true },

    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      default: null,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessContact",
      default: null,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    productID: { type: String },


    inventoryPrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    finalPrice: { type: Number, default: 0 },

    payments: { type: [paymentSchema], default: [] },

    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid"],
      default: "pending",
    },

    profit: { type: Number, default: 0 },
    soldAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false }
);

soldSchema.index({ paymentStatus: 1, createdAt: -1 });

/* 🔒 HARD RULE: INVENTORY OR ORDER (ONLY ONE) */
soldSchema.pre("validate", function (next) {
  const hasInventory = !!this.inventoryId;
  const hasOrder = !!this.orderId;

  if (!hasInventory && !hasOrder) {
    return next(new Error("Sold must be linked to either Inventory or Order"));
  }
  if (hasInventory && hasOrder) {
    return next(new Error("Sold cannot be linked to both Inventory and Order"));
  }
  next();
});

/* 🔢 BILLING ID */
soldSchema.pre("validate", async function (next) {
  if (this.isNew && !this.billingID) {
    const counter = await Counter.findOneAndUpdate(
      { name: "sold" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    this.billingID = `BILL_ID_${counter.seq.toString().padStart(7, "0")}`;
  }
  next();
});

/* 💰 AUTO CALCS */
soldSchema.pre("save", function (next) {
  this.finalPrice = Math.max(
    Number(this.sellingPrice || 0) - Number(this.discount || 0),
    0
  );

  const totalPaid = (this.payments || []).reduce(
    (s, p) => s + Number(p.amount || 0),
    0
  );

  if (totalPaid === 0) this.paymentStatus = "pending";
  else if (totalPaid < this.finalPrice) this.paymentStatus = "partial";
  else this.paymentStatus = "paid";

  this.profit =
    Number(this.finalPrice || 0) - Number(this.inventoryPrice || 0);

  next();
});

export default mongoose.model("Sold", soldSchema);