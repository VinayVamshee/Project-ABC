import mongoose from "mongoose";
import Counter from "./counterModel.js";

const settlementLogEntrySchema = new mongoose.Schema(
  {
    txnObjectId:  { type: mongoose.Schema.Types.ObjectId, ref: "LedgerTransaction", default: null },
    txnId:        { type: String, default: "" },        // human-readable e.g. LTXN_000003
    date:         { type: Date,   default: Date.now },
    assetType:    { type: String, default: "money" },   // original asset ("money"|"gold"|"goods")
    direction:    { type: String, default: "added" },   // "added" | "settled"

    // ₹ applied (either added to debt or settled against debt)
    moneyApplied:  { type: Number, default: 0 },

    // Gold specifics (populated even when using valuation for ₹ netting)
    goldGrams:     { type: Number, default: 0 },
    goldValuation: { type: Number, default: 0 },

    description: { type: String, default: "" },
  },
  { _id: false }
);

const ledgerObligationSchema = new mongoose.Schema(
  {
    // ── Auto-generated ID ──────────────────────────────────────
    obligationId: { type: String, unique: true }, // e.g. LOB_000001

    // ── Who owes whom (null = Business Owner) ─────────────────
    debtorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessContact",
      default: null,
    },
    creditorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessContact",
      default: null,
    },

    // ── UNIFIED BALANCE TRACKING ───────────────────────────────
    // All cash, goods, and gold (with ₹ valuation) are unified into moneyBalance.
    // Pure gold (with no ₹ valuation entered) is tracked separately in goldBalance.
    // These two balances are independent — cash/goods don't cross-settle raw gold grams.

    moneyBalance: { type: Number, default: 0 },        // net ₹ outstanding
    goldBalance:  { type: Number, default: 0 },        // net grams outstanding (pure gold, no valuation)
    goldBalanceValuation: { type: Number, default: 0 },// ₹ value of goldBalance if known

    // Running totals for analytics/display
    totalDebtMoney:    { type: Number, default: 0 },   // total ₹ ever added as debt
    totalSettledMoney: { type: Number, default: 0 },   // total ₹ ever settled

    // ── Status ────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["outstanding", "partially_settled", "settled", "void"],
      default: "outstanding",
    },

    // ── Settlement audit trail ─────────────────────────────────
    settlementLog: [settlementLogEntrySchema],

    // ── Source transactions ────────────────────────────────────
    sourceTransactionIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "LedgerTransaction" },
    ],

    // ── Optional context ──────────────────────────────────────
    description: { type: String, default: "" },
    notes:        { type: String, default: "" },
    voidReason:   { type: String, default: "" },
  },
  { timestamps: true, versionKey: false }
);

// Indexes
ledgerObligationSchema.index({ debtorId: 1, creditorId: 1, status: 1 });
ledgerObligationSchema.index({ debtorId: 1, status: 1 });
ledgerObligationSchema.index({ creditorId: 1, status: 1 });

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
