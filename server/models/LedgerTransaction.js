import mongoose from "mongoose";
import Counter from "./counterModel.js";

const ledgerTransactionSchema = new mongoose.Schema(
  {
    // ── Auto-generated ID ──────────────────────────────────────
    txnId: { type: String, unique: true }, // e.g. LTXN_000001

    // ── Group linkage (for batch pay-on-behalf events) ────────
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LedgerTransactionGroup",
      default: null,
    },

    // ── Date ──────────────────────────────────────────────────
    transactionDate: { type: Date, default: Date.now },

    // ── Transaction type ──────────────────────────────────────
    transactionType: {
      type: String,
      enum: [
        "advance",      // Owner gives money/gold to someone (creates receivable)
        "repayment",    // Someone pays back to Owner
        "purchase",     // Owner buys something
        "sale",         // Owner sells something
        "transfer",     // Generic asset transfer
        "settlement",   // Explicitly settling an obligation
        "adjustment",   // Correction entry
        "expense",      // Cost/expense (does NOT create receivable from receiver)
        "wage",         // Worker wage (does NOT create receivable from worker)
        "other",
      ],
      required: true,
    },

    // ── 3-Party Roles (null = Business Owner) ─────────────────
    // Who physically gave the asset?
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessContact",
      default: null,
    },
    // Who physically received the asset?
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessContact",
      default: null,
    },
    // On whose behalf was this given? (null = Owner)
    onBehalfOfId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessContact",
      default: null,
    },

    // ── Asset Type ────────────────────────────────────────────
    assetType: {
      type: String,
      enum: ["money", "gold", "goods"],
      required: true,
    },

    // ── Money fields (when assetType = "money") ───────────────
    money: {
      amount:   { type: Number, default: 0 },
      currency: { type: String, default: "INR" },
    },

    // ── Gold fields (when assetType = "gold") ─────────────────
    gold: {
      weight:      { type: Number, default: 0 },   // grams
      purity:      { type: String, default: "" },   // "22K", "18K", "91.6%", etc.
      ratePerGram: { type: Number, default: 0 },    // INR per gram at time of txn
      valuation:   { type: Number, default: 0 },    // total INR value
    },

    // ── Goods fields (when assetType = "goods") ───────────────
    goods: {
      description: { type: String, default: "" },
      quantity:    { type: Number, default: 1 },
      unit:        { type: String, default: "piece" },
      valuation:   { type: Number, default: 0 },
      inventoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Inventory",
        default: null,
      },
    },

    // ── Payment method (for money transactions) ───────────────
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Bank Transfer", "Cheque", "Gold Settlement", "Other"],
      default: "Cash",
    },

    // ── Optional cross-references ─────────────────────────────
    relatedObligationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LedgerObligation",
      default: null,
    },
    relatedSoldId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sold",
      default: null,
    },
    relatedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    // ── Settlement linkage ────────────────────────────────────
    isSettlement:        { type: Boolean, default: false },
    settledObligationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LedgerObligation",
      default: null,
    },

    // ── Description / Notes ───────────────────────────────────
    description: { type: String, default: "" },
    notes:        { type: String, default: "" },

    // ── Audit ─────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["active", "void"],
      default: "active",
    },
    voidReason: { type: String, default: "" },
    recordedBy: { type: String, default: "admin" },
  },
  { timestamps: true, versionKey: false }
);

// Indexes for fast querying
ledgerTransactionSchema.index({ providerId: 1 });
ledgerTransactionSchema.index({ receiverId: 1 });
ledgerTransactionSchema.index({ onBehalfOfId: 1 });
ledgerTransactionSchema.index({ groupId: 1 });
ledgerTransactionSchema.index({ transactionDate: -1 });
ledgerTransactionSchema.index({ status: 1 });

// Auto-generate txnId before validate
ledgerTransactionSchema.pre("validate", async function (next) {
  if (this.isNew && !this.txnId) {
    const counter = await Counter.findOneAndUpdate(
      { name: "ledgertxn" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.txnId = `LTXN_${counter.seq.toString().padStart(6, "0")}`;
  }
  next();
});

export default mongoose.model("LedgerTransaction", ledgerTransactionSchema);
