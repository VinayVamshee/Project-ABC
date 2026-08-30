import mongoose from "mongoose";
import Counter from "./counterModel.js";

const ledgerTransactionGroupSchema = new mongoose.Schema(
  {
    // ── Auto-generated ID ──────────────────────────────────────
    groupId: { type: String, unique: true }, // e.g. LGP_000001

    // ── Group metadata ─────────────────────────────────────────
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    transactionType: {
      type: String,
      enum: ["advance", "wage", "expense", "purchase", "sale", "transfer", "settlement", "other"],
      default: "other",
    },

    // ── Common participants for the whole group ────────────────
    // Who physically provided the asset for all transactions
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessContact",
      default: null, // null = Owner
    },
    // On whose behalf (null = Owner)
    onBehalfOfId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessContact",
      default: null,
    },

    // ── Aggregated totals (denormalised for quick display) ────
    totalMoneyAmount: { type: Number, default: 0 },
    totalGoldWeight:  { type: Number, default: 0 },
    transactionCount: { type: Number, default: 0 },

    // ── Resulting obligation (if any) ─────────────────────────
    resultingObligationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LedgerObligation",
      default: null,
    },

    // ── Date ──────────────────────────────────────────────────
    groupDate: { type: Date, default: Date.now },

    // ── Status ────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["active", "void"],
      default: "active",
    },
  },
  { timestamps: true, versionKey: false }
);

ledgerTransactionGroupSchema.index({ providerId: 1 });
ledgerTransactionGroupSchema.index({ onBehalfOfId: 1 });
ledgerTransactionGroupSchema.index({ groupDate: -1 });

// Auto-generate groupId
ledgerTransactionGroupSchema.pre("validate", async function (next) {
  if (this.isNew && !this.groupId) {
    const counter = await Counter.findOneAndUpdate(
      { name: "ledgergroup" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.groupId = `LGP_${counter.seq.toString().padStart(6, "0")}`;
  }
  next();
});

export default mongoose.model("LedgerTransactionGroup", ledgerTransactionGroupSchema);
