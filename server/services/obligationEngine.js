/**
 * OBLIGATION ENGINE
 * =================
 * Core business logic: given a physical transaction, determine which
 * obligations are created, updated, or settled.
 *
 * GROUND RULES:
 *   null = Business Owner (the shop itself)
 *
 * THE 4 QUESTIONS EVERY TRANSACTION MUST ANSWER:
 *   1. Who PROVIDED the asset?       → providerId  (null = Owner)
 *   2. Who RECEIVED the asset?       → receiverId  (null = Owner)
 *   3. On whose BEHALF?              → onBehalfOfId (null = Owner)
 *   4. What was the ASSET?           → assetType + amount/weight
 *
 * OBLIGATION CREATION RULES:
 *   Rule A — Provider ≠ OnBehalfOf:
 *     OnBehalfOf OWES Provider the asset.
 *     Example: Wholeseller(provider) pays Worker on behalf of Owner(onBehalfOf)
 *              → Owner owes Wholeseller
 *
 *   Rule B — Receiver ≠ OnBehalfOf:
 *     Receiver OWES OnBehalfOf the asset.
 *     Example: Owner(onBehalfOf) gives advance to Worker(receiver)
 *              → Worker owes Owner
 *     EXCEPTION: transactionType = "expense" | "wage" → skip Rule B
 *     (Wages/expenses are not loans; the worker doesn't owe their wages back)
 *
 *   SETTLEMENT / REPAYMENT:
 *     Find the matching existing outstanding obligation and reduce it.
 */

import LedgerObligation from "../models/LedgerObligation.js";

const OWNER = null; // null always means the business owner

// Transaction types that do NOT create a receivable from the receiver
const NON_RECEIVABLE_TYPES = ["expense", "wage"];

/**
 * Stringify a participant ID for comparison.
 * Both null/undefined map to "OWNER".
 */
function pid(id) {
  if (id === null || id === undefined) return "OWNER";
  return id.toString();
}

/**
 * Check whether two participant IDs refer to the same entity.
 */
function same(a, b) {
  return pid(a) === pid(b);
}

/**
 * Find an existing active obligation between debtor and creditor for an asset type.
 * Used when adding to or settling against an existing obligation.
 */
async function findExistingObligation(debtorId, creditorId, assetType, session) {
  return LedgerObligation.findOne({
    debtorId:   debtorId ?? null,
    creditorId: creditorId ?? null,
    assetType,
    status: { $in: ["outstanding", "partially_settled"] },
  }).session(session);
}

/**
 * Create a new obligation or add to an existing one.
 * Returns the obligation document.
 */
async function upsertObligation({
  debtorId,
  creditorId,
  assetType,
  moneyAmount = 0,
  goldWeight = 0,
  goldPurity = "",
  transactionId,
  description = "",
  session,
}) {
  const existing = await findExistingObligation(debtorId, creditorId, assetType, session);

  if (existing) {
    // Add to existing obligation
    if (assetType === "money") {
      existing.money.originalAmount    += moneyAmount;
      existing.money.outstandingAmount += moneyAmount;
    } else if (assetType === "gold") {
      existing.gold.originalWeight    += goldWeight;
      existing.gold.outstandingWeight += goldWeight;
    }
    existing.sourceTransactionIds.push(transactionId);
    existing.status = existing.money.outstandingAmount > 0 || existing.gold.outstandingWeight > 0
      ? "outstanding"
      : "settled";
    await existing.save({ session });
    return existing;
  }

  // Create new obligation
  const obligation = new LedgerObligation({
    debtorId:    debtorId ?? null,
    creditorId:  creditorId ?? null,
    assetType,
    money: assetType === "money" ? {
      originalAmount:    moneyAmount,
      settledAmount:     0,
      outstandingAmount: moneyAmount,
      currency: "INR",
    } : { originalAmount: 0, settledAmount: 0, outstandingAmount: 0 },
    gold: assetType === "gold" ? {
      purity:            goldPurity,
      originalWeight:    goldWeight,
      settledWeight:     0,
      outstandingWeight: goldWeight,
    } : { originalWeight: 0, settledWeight: 0, outstandingWeight: 0 },
    sourceTransactionIds: [transactionId],
    description,
    status: "outstanding",
  });

  await obligation.save({ session });
  return obligation;
}

/**
 * Main engine function.
 * Called after a LedgerTransaction has been saved.
 * Returns array of obligation documents that were created or updated.
 */
export async function processTransaction(transaction, session) {
  const {
    _id: transactionId,
    providerId,
    receiverId,
    onBehalfOfId,
    transactionType,
    assetType,
    money,
    gold,
    isSettlement,
    settledObligationId,
  } = transaction;

  const obligations = [];

  // ── SETTLEMENT PATH ─────────────────────────────────────────────────
  // If this is a settlement transaction, it is handled separately by
  // ledgerSettlementService. The engine does NOT re-process it.
  if (isSettlement && settledObligationId) {
    return obligations;
  }

  const moneyAmount = money?.amount || 0;
  const goldWeight  = gold?.weight  || 0;
  const goldPurity  = gold?.purity  || "";

  // ── REPAYMENT PATH ───────────────────────────────────────────────────
  // If transactionType is "repayment", find the inverse obligation and
  // reduce it (same logic as partial settlement).
  if (transactionType === "repayment") {
    // Provider is paying back to receiver — reduce receiver-owes-provider obligation
    // Or: Provider owes Receiver → provider is paying back
    const existing = await findExistingObligation(
      providerId ?? null,   // debtor = the one who was paying back (they owed)
      receiverId ?? null,   // creditor = the one being paid back
      assetType,
      session
    );
    if (existing) {
      if (assetType === "money") {
        existing.money.settledAmount     += moneyAmount;
        existing.money.outstandingAmount  = Math.max(0, existing.money.originalAmount - existing.money.settledAmount);
      } else if (assetType === "gold") {
        existing.gold.settledWeight     += goldWeight;
        existing.gold.outstandingWeight  = Math.max(0, existing.gold.originalWeight - existing.gold.settledWeight);
      }
      existing.status =
        (assetType === "money" && existing.money.outstandingAmount <= 0) ||
        (assetType === "gold"  && existing.gold.outstandingWeight  <= 0)
          ? "settled"
          : "partially_settled";
      existing.sourceTransactionIds.push(transactionId);
      await existing.save({ session });
      obligations.push(existing);
    }
    return obligations;
  }

  // ── NORMAL TRANSACTION PATH ──────────────────────────────────────────

  // ── RULE A: Provider ≠ OnBehalfOf → OnBehalfOf owes Provider ────────
  // e.g. Wholeseller(provider) pays Worker on Owner's(onBehalfOf) behalf
  //      → Owner owes Wholeseller
  if (!same(providerId, onBehalfOfId)) {
    const ob = await upsertObligation({
      debtorId:    onBehalfOfId ?? null,   // the one on whose behalf (OWNER or contact)
      creditorId:  providerId   ?? null,   // the one who provided the asset
      assetType,
      moneyAmount,
      goldWeight,
      goldPurity,
      transactionId,
      description: `From transaction ${transactionId}: ${transactionType}`,
      session,
    });
    obligations.push(ob);
  }

  // ── RULE B: Receiver ≠ OnBehalfOf → Receiver owes OnBehalfOf ────────
  // e.g. Owner gives advance to Worker → Worker owes Owner
  // EXCEPTION: expense / wage types skip this — those are not loans
  if (!same(receiverId, onBehalfOfId) && !NON_RECEIVABLE_TYPES.includes(transactionType)) {
    const ob = await upsertObligation({
      debtorId:    receiverId   ?? null,   // the receiver owes
      creditorId:  onBehalfOfId ?? null,   // the one on behalf of whom (OWNER)
      assetType,
      moneyAmount,
      goldWeight,
      goldPurity,
      transactionId,
      description: `From transaction ${transactionId}: ${transactionType}`,
      session,
    });
    obligations.push(ob);
  }

  return obligations;
}

/**
 * Exported helper: find existing obligation between two parties.
 * Used by the settlement service.
 */
export { findExistingObligation };
