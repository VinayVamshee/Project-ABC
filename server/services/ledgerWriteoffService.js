/**
 * LEDGER WRITE-OFF SERVICE
 * Waives a portion (or all) of an obligation without any actual money/gold movement.
 * Use cases: salary offset, concession, debt forgiveness.
 */

import LedgerObligation from "../models/LedgerObligation.js";

export async function writeOffObligation(params, session) {
  const {
    obligationId,
    amount   = 0,
    reason   = "",
  } = params;

  if (!reason || !reason.trim()) {
    throw new Error("A reason is required for a write-off.");
  }

  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    throw new Error("Write-off amount must be greater than zero.");
  }

  const obligation = await LedgerObligation.findById(obligationId).session(session);
  if (!obligation) throw new Error("Obligation not found.");
  if (obligation.status === "settled") throw new Error("This obligation is already fully settled.");
  if (obligation.status === "void")    throw new Error("This obligation is void and cannot be written off.");

  // Cap write-off at current outstanding balance
  const effectiveAmount = Math.min(numAmount, obligation.moneyBalance || 0);

  if (effectiveAmount <= 0) {
    throw new Error("No outstanding money balance to write off.");
  }

  // Reduce balances
  obligation.moneyBalance     -= effectiveAmount;
  obligation.totalSettledMoney = (obligation.totalSettledMoney || 0) + effectiveAmount;

  // Log it
  obligation.settlementLog.push({
    date:         new Date(),
    assetType:    "money",
    direction:    "writeoff",
    moneyApplied: effectiveAmount,
    goldGrams:    0,
    goldValuation: 0,
    description:  reason.trim(),
  });

  // Recompute status
  const stillOwes =
    (obligation.moneyBalance || 0) > 0.001 ||
    (obligation.goldBalance  || 0) > 0.001;
  obligation.status = stillOwes ? "partially_settled" : "settled";

  await obligation.save({ session });

  return { obligation };
}
