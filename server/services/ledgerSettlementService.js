/**
 * LEDGER SETTLEMENT SERVICE
 * Manual settlement of an obligation via a dedicated settlement transaction.
 * Applies the payment to the unified moneyBalance / goldBalance.
 */

import LedgerTransaction from "../models/LedgerTransaction.js";
import LedgerObligation  from "../models/LedgerObligation.js";

export async function settleObligation(params, session) {
  const {
    obligationId,
    settleAsset    = "money",
    moneyAmount    = 0,
    goldWeight     = 0,
    goldValuation  = 0,
    goldPurity     = "",
    goldRate       = 0,
    paymentMethod  = "Cash",
    notes          = "",
  } = params;

  const obligation = await LedgerObligation.findById(obligationId).session(session);
  if (!obligation) throw new Error("Obligation not found");
  if (obligation.status === "settled") throw new Error("Already fully settled");
  if (obligation.status === "void")    throw new Error("Obligation is void");

  // ── Record a settlement transaction ────────────────────────────────────
  const settlementTxn = new LedgerTransaction({
    transactionType:  "settlement",
    providerId:       obligation.debtorId,
    receiverId:       obligation.creditorId,
    onBehalfOfId:     obligation.debtorId,
    assetType:        settleAsset,
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
    isSettlement:         true,
    settledObligationId:  obligation._id,
    notes,
    description: `Settlement of ${obligation.obligationId}`,
    status: "active",
  });
  await settlementTxn.save({ session });

  // ── Apply settlement to unified obligation ─────────────────────────────
  // Determine effective ₹ value of the settlement payment
  let effectiveMoney = 0;
  let goldGramsSettled = 0;

  if (settleAsset === "money") {
    effectiveMoney = Number(moneyAmount);
  } else if (settleAsset === "gold") {
    if (goldValuation > 0) {
      effectiveMoney = Number(goldValuation);
    } else {
      // No valuation → settle grams against goldBalance
      goldGramsSettled = Number(goldWeight);
    }
  }

  // Reduce moneyBalance
  if (effectiveMoney > 0 && obligation.moneyBalance > 0) {
    const settled = Math.min(obligation.moneyBalance, effectiveMoney);
    obligation.moneyBalance       -= settled;
    obligation.totalSettledMoney   = (obligation.totalSettledMoney || 0) + settled;
  }

  // Reduce goldBalance (for pure gold gram settlements)
  if (goldGramsSettled > 0 && obligation.goldBalance > 0) {
    const settled = Math.min(obligation.goldBalance, goldGramsSettled);
    obligation.goldBalance -= settled;
    if (obligation.goldBalance <= 0.001) { obligation.goldBalance = 0; obligation.goldBalanceValuation = 0; }
  }

  // Log the settlement entry
  obligation.settlementLog.push({
    txnObjectId:  settlementTxn._id,
    txnId:        settlementTxn.txnId,
    date:         settlementTxn.transactionDate || new Date(),
    assetType:    settleAsset,
    direction:    "settled",
    moneyApplied: effectiveMoney,
    goldGrams:    settleAsset === "gold" ? Number(goldWeight)    : 0,
    goldValuation: settleAsset === "gold" ? Number(goldValuation) : 0,
    description:  `Manual settlement`,
  });

  const stillOwes = obligation.moneyBalance > 0.001 || obligation.goldBalance > 0.001;
  obligation.status = stillOwes
    ? "partially_settled"
    : "settled";

  obligation.sourceTransactionIds.push(settlementTxn._id);
  await obligation.save({ session });

  return { transaction: settlementTxn, obligation };
}
