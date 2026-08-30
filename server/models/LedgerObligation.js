import mongoose from "mongoose";
import Counter from "./counterModel.js";

const ledgerObligationSchema = new mongoose.Schema(
  {
    // ── Auto-generated ID ──────────────────────────────────────
    obligationId: { type: String, unique: true }, // e.g. LOB_000001

    // ── Who owes whom (null = Business Owner) ─────────────────
    // The person who owes the asset
    debtorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessContact",
      default: null,
    },
    // The person who is owed the asset
    creditorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessContact",
      default: null,
    },

    // ── Asset type ────────────────────────────────────────────
    assetType: {
      type: String,
      enum: ["money", "gold", "goods"],
      required: true,
    },

    // ── Money obligation ──────────────────────────────────────
    money: {
      originalAmount:    { type: Number, default: 0 },
      settledAmount:     { type: Number, default: 0 },
      outstandingAmount: { type: Number, default: 0 },
      currency:          { type: String, default: "INR" },
    },

    // ── Gold obligation ───────────────────────────────────────
    gold: {
      purity:           { type: String, default: "" },  // e.g. "22K"
      originalWeight:   { type: Number, default: 0 },   // grams
      settledWeight:    { type: Number, default: 0 },
      outstandingWeight:{ type: Number, default: 0 },
    },

    // ── Status ────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["outstanding", "partially_settled", "settled", "void"],
      default: "outstanding",
    },

    // ── Source transactions that created/affected this ────────
    sourceTransactionIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LedgerTransaction",
      },
    ],

    // ── Optional context ──────────────────────────────────────
    description: { type: String, default: "" },
    notes:        { type: String, default: "" },

    // ── Void audit ────────────────────────────────────────────
    voidReason: { type: String, default: "" },
  },
  { timestamps: true, versionKey: false }
);

// Indexes for fast querying of who owes what
ledgerObligationSchema.index({ debtorId: 1, status: 1 });
ledgerObligationSchema.index({ creditorId: 1, status: 1 });
ledgerObligationSchema.index({ assetType: 1, status: 1 });

// Auto-generate obligationId
ledgerObligationSchema.pre("validate", async function (next) {
  if (this.isNew && !this.obligationId) {
    const counter = await Counter.findOneAndUpdate(
      { name: "ledgerobligation" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.obligationId = `LOB_${counter.seq.toString().padStart(6, "0")}`;
  }
  next();
});

export default mongoose.model("LedgerObligation", ledgerObligationSchema);
