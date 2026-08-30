/**
 * LEDGER SETTLEMENT SERVICE
 * Handles partial, full, and cross-asset settlement of obligations.
 * All operations run inside MongoDB sessions for atomicity.
 */

import LedgerTransaction from "../models/LedgerTransaction.js";
import LedgerObligation from "../models/LedgerObligation.js";

/**
 * Settle an obligation (partially or fully).
 *
 * Cross-asset settlement is supported:
 *   - Money obligation settled with gold → gold.valuation reduces money.outstandingAmount
 *   - Gold obligation settled with money → amount reduces gold outstanding proportionally
 *
 * @param {Object} params
 * @param {string} params.obligationId   - _id of the LedgerObligation
 * @param {string} params.settleAsset    - "money" | "gold"
 * @param {number} params.moneyAmount    - if settling with money
 * @param {number} params.goldWeight     - if settling with gold
 * @param {number} params.goldValuation  - gold value in INR (for cross-asset)
 * @param {string} params.paymentMethod
 * @param {string} params.notes
 * @param {Object} session               - mongoose session
 */
export async function settleObligation(params, session) {
  const {
    obligationId,
    settleAsset,
    moneyAmount = 0,
    goldWeight  = 0,
    goldValuation = 0,
    goldPurity  = "",
    goldRate    = 0,
    paymentMethod = "Cash",
    notes = "",
  } = params;

  const obligation = await LedgerObligation.findById(obligationId).session(session);
  if (!obligation) throw new Error("Obligation not found");
  if (obligation.status === "settled") throw new Error("This obligation is already fully settled");
  if (obligation.status === "void")    throw new Error("This obligation has been voided");

  // ── Build the settlement transaction ────────────────────────
  const settlementTxn = new LedgerTransaction({
    transactionType: "settlement",
    // Debtor pays creditor
    providerId:   obligation.debtorId,
    receiverId:   obligation.creditorId,
    onBehalfOfId: obligation.debtorId,
    assetType:    settleAsset,
    money: {
      amount:   settleAsset === "money" ? Number(moneyAmount) : 0,
      currency: "INR",
    },
    gold: {
      weight:      settleAsset === "gold" ? Number(goldWeight)    : 0,
      purity:      goldPurity,
      ratePerGram: Number(goldRate),
      valuation:   settleAsset === "gold" ? Number(goldValuation) : 0,
    },
    paymentMethod,
    isSettlement:        true,
    settledObligationId: obligation._id,
    notes,
    description: `Settlement of ${obligation.obligationId}`,
    status: "active",
  });

  await settlementTxn.save({ session });

  // ── Apply to obligation ──────────────────────────────────────
  if (obligation.assetType === "money") {
    let settledValue = 0;
    if (settleAsset === "money") {
      settledValue = Number(moneyAmount);
    } else if (settleAsset === "gold") {
      // Cross-asset: use gold valuation to reduce money obligation
      settledValue = Number(goldValuation);
    }
    obligation.money.settledAmount     += settledValue;
    obligation.money.outstandingAmount  = Math.max(
      0,
      obligation.money.originalAmount - obligation.money.settledAmount
    );

  } else if (obligation.assetType === "gold") {
    let settledGrams = 0;
    if (settleAsset === "gold") {
      settledGrams = Number(goldWeight);
    } else if (settleAsset === "money") {
      // Cross-asset: convert cash to grams using rate
      if (goldRate > 0) {
        settledGrams = Number(moneyAmount) / Number(goldRate);
      }
    }
    obligation.gold.settledWeight     += settledGrams;
    obligation.gold.outstandingWeight  = Math.max(
      0,
      obligation.gold.originalWeight - obligation.gold.settledWeight
    );
  }

  // ── Update status ────────────────────────────────────────────
  const isMoneyObligation = obligation.assetType === "money";
  const outstanding = isMoneyObligation
    ? obligation.money.outstandingAmount
    : obligation.gold.outstandingWeight;

  obligation.status = outstanding <= 0 ? "settled" : "partially_settled";
  obligation.sourceTransactionIds.push(settlementTxn._id);

  await obligation.save({ session });

  return { transaction: settlementTxn, obligation };
}
