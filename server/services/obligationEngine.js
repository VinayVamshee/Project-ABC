/**
 * OBLIGATION ENGINE — UNIFIED CROSS-ASSET LEDGER
 * ================================================
 * ONE obligation per (debtorId, creditorId) pair.
 * All asset types (money, goods, gold-with-valuation) settle against the same
 * moneyBalance. Pure gold (no ₹ valuation) is tracked separately in goldBalance.
 *
 * GROUND RULES:
 *   null = Business Owner
 *
 * ENGINE RULES (unchanged):
 *   Rule A — Provider ≠ OnBehalfOf → OnBehalfOf OWES Provider
 *   Rule B — Receiver ≠ OnBehalfOf → Receiver OWES OnBehalfOf
 *     EXCEPTION: expense | wage → skip Rule B
 *
 * SETTLEMENT:
 *   Any asset's ₹ value can settle any ₹ debt.
 *   Pure gold grams (no valuation) only settle other pure gold gram debts.
 */

import LedgerObligation from "../models/LedgerObligation.js";

const NON_RECEIVABLE_TYPES = ["expense", "wage"];

function pid(id) {
  if (id === null || id === undefined) return "OWNER";
  return id.toString();
}

function same(a, b) {
  return pid(a) === pid(b);
}

/**
 * Find the single unified obligation between a debtor and creditor.
 */
async function findObligation(debtorId, creditorId, session) {
  return LedgerObligation.findOne({
    debtorId:   debtorId   ?? null,
    creditorId: creditorId ?? null,
    status: { $in: ["outstanding", "partially_settled"] },
  }).session(session);
}

/**
 * Compute the running status from the balances.
 */
function computeStatus(ob) {
  const hasBalance = ob.moneyBalance > 0.001 || ob.goldBalance > 0.001;
  if (!hasBalance) return "settled";
  if (ob.totalSettledMoney > 0 || ob.settlementLog.some(e => e.direction === "settled")) {
    return "partially_settled";
  }
  return "outstanding";
}

/**
 * Core upsert function.
 *
 * @param debtorId    — who owes
 * @param creditorId  — who is owed
 * @param effectiveMoney — ₹ value being added to obligation (cash, goods val, or gold val)
 * @param pureGoldGrams  — grams added as PURE gold (no valuation) only
 * @param assetType   — original asset type of the source transaction
 * @param goldGrams   — raw gold grams (for audit log)
 * @param goldValuation — ₹ value of gold (for audit log)
 * @param transactionId — Mongo ObjectId of the transaction
 * @param txnId         — human-readable txnId string
 * @param txnDate       — date of the transaction
 * @param description
 * @param session
 */
async function upsertObligation({
  debtorId,
  creditorId,
  effectiveMoney = 0,
  pureGoldGrams = 0,
  assetType,
  goldGrams = 0,
  goldValuation = 0,
  transactionId,
  txnId = "",
  txnDate,
  description = "",
  session,
}) {
  let remainingMoney     = effectiveMoney;
  let remainingGoldGrams = pureGoldGrams;

  // ── STEP 1: Check for REVERSE obligation and OFFSET (netting) ──────────
  const reverseOb = await findObligation(creditorId, debtorId, session);

  if (reverseOb) {
    let moneySettled   = 0;
    let goldGramsSettled = 0;

    // Offset ₹ balance on the reverse obligation
    if (remainingMoney > 0 && reverseOb.moneyBalance > 0) {
      const offset = Math.min(reverseOb.moneyBalance, remainingMoney);
      reverseOb.moneyBalance  -= offset;
      reverseOb.totalSettledMoney = (reverseOb.totalSettledMoney || 0) + offset;
      remainingMoney          -= offset;
      moneySettled            += offset;
    }

    // Offset pure gold gram balance on the reverse (only for pure gold transactions)
    if (remainingGoldGrams > 0 && reverseOb.goldBalance > 0) {
      const offset = Math.min(reverseOb.goldBalance, remainingGoldGrams);
      reverseOb.goldBalance  -= offset;
      if (reverseOb.goldBalance <= 0.001) {
        reverseOb.goldBalance = 0;
        reverseOb.goldBalanceValuation = 0;
      }
      remainingGoldGrams -= offset;
      goldGramsSettled   += offset;
    }

    if (moneySettled > 0 || goldGramsSettled > 0) {
      reverseOb.settlementLog.push({
        txnObjectId:  transactionId,
        txnId,
        date:         txnDate || new Date(),
        assetType,
        direction:    "settled",
        moneyApplied: moneySettled,
        goldGrams:    assetType === "gold" ? goldGrams : 0,
        goldValuation: assetType === "gold" ? goldValuation : 0,
        description,
      });
      reverseOb.sourceTransactionIds.push(transactionId);
      reverseOb.status = computeStatus(reverseOb);
      await reverseOb.save({ session });
    }
  }

  // ── STEP 2: If fully netted, done ──────────────────────────────────────
  if (remainingMoney <= 0.001 && remainingGoldGrams <= 0.001) {
    return reverseOb;
  }

  // ── STEP 3: Add remaining to existing or create a new forward obligation ─
  let ob = await findObligation(debtorId, creditorId, session);

  if (!ob) {
    ob = new LedgerObligation({
      debtorId:   debtorId   ?? null,
      creditorId: creditorId ?? null,
      moneyBalance:         0,
      goldBalance:          0,
      goldBalanceValuation: 0,
      totalDebtMoney:       0,
      totalSettledMoney:    0,
      status:               "outstanding",
      settlementLog:        [],
      sourceTransactionIds: [],
    });
  }

  if (remainingMoney > 0) {
    ob.moneyBalance    += remainingMoney;
    ob.totalDebtMoney   = (ob.totalDebtMoney || 0) + remainingMoney;
    // For gold, also track the raw grams alongside the money balance
    if (assetType === "gold" && goldGrams > 0 && goldValuation > 0) {
      ob.goldBalance          += goldGrams;
      ob.goldBalanceValuation += goldValuation;
    }
  }
  if (remainingGoldGrams > 0) {
    ob.goldBalance += remainingGoldGrams;
  }

  ob.settlementLog.push({
    txnObjectId:  transactionId,
    txnId,
    date:         txnDate || new Date(),
    assetType,
    direction:    "added",
    moneyApplied: remainingMoney,
    goldGrams:    assetType === "gold" ? goldGrams : 0,
    goldValuation: assetType === "gold" ? goldValuation : 0,
    description,
  });

  ob.sourceTransactionIds.push(transactionId);
  ob.status = computeStatus(ob);
  await ob.save({ session });
  return ob;
}

/**
 * Main engine — called after a LedgerTransaction is saved.
 */
export async function processTransaction(transaction, session) {
  const {
    _id:              transactionId,
    txnId,
    transactionDate,
    providerId,
    receiverId,
    onBehalfOfId,
    transactionType,
    assetType,
    money,
    gold,
    goods,
    isSettlement,
    settledObligationId,
  } = transaction;

  const obligations = [];

  // Settlement transactions are handled by ledgerSettlementService — skip.
  if (isSettlement && settledObligationId) return obligations;

  // ── Resolve effective ₹ value and gold grams ───────────────────────────
  const moneyAmount     = money?.amount    || 0;
  const goldGrams       = gold?.weight     || 0;
  const goldPurity      = gold?.purity     || "";
  const goldValuation   = gold?.valuation  || 0;
  const goodsValuation  = goods?.valuation || 0;

  let effectiveMoney = 0;
  let pureGoldGrams  = 0;

  if (assetType === "money") {
    effectiveMoney = moneyAmount;
  } else if (assetType === "goods") {
    effectiveMoney = goodsValuation;
  } else if (assetType === "gold") {
    if (goldValuation > 0) {
      effectiveMoney = goldValuation; // valued gold → net against ₹ balance
    } else {
      pureGoldGrams = goldGrams;      // no valuation → track in gold grams
    }
  }

  const txnDate = transactionDate || new Date();
  const logDesc = `${transactionType} — ${assetType}`;

  // ── REPAYMENT PATH ────────────────────────────────────────────────────
  if (transactionType === "repayment") {
    // Provider is paying back creditor — find obligation where provider is the debtor
    const ob = await findObligation(
      providerId  ?? null,
      receiverId  ?? null,
      session
    );
    if (ob) {
      let moneySettled    = 0;
      let goldGramsSettled = 0;

      if (effectiveMoney > 0 && ob.moneyBalance > 0) {
        const offset = Math.min(ob.moneyBalance, effectiveMoney);
        ob.moneyBalance       -= offset;
        ob.totalSettledMoney   = (ob.totalSettledMoney || 0) + offset;
        moneySettled           += offset;
      }
      if (pureGoldGrams > 0 && ob.goldBalance > 0) {
        const offset = Math.min(ob.goldBalance, pureGoldGrams);
        ob.goldBalance -= offset;
        if (ob.goldBalance <= 0.001) { ob.goldBalance = 0; ob.goldBalanceValuation = 0; }
        goldGramsSettled += offset;
      }

      if (moneySettled > 0 || goldGramsSettled > 0) {
        ob.settlementLog.push({
          txnObjectId:  transactionId,
          txnId,
          date:         txnDate,
          assetType,
          direction:    "settled",
          moneyApplied: moneySettled,
          goldGrams:    assetType === "gold" ? goldGrams : 0,
          goldValuation: assetType === "gold" ? goldValuation : 0,
          description:  logDesc,
        });
        ob.sourceTransactionIds.push(transactionId);
        ob.status = computeStatus(ob);
        await ob.save({ session });
        obligations.push(ob);
      }
    }
    return obligations;
  }

  // ── NORMAL TRANSACTION PATH ───────────────────────────────────────────

  // Rule A: Provider ≠ OnBehalfOf → OnBehalfOf owes Provider
  if (!same(providerId, onBehalfOfId)) {
    const ob = await upsertObligation({
      debtorId:    onBehalfOfId ?? null,
      creditorId:  providerId   ?? null,
      effectiveMoney,
      pureGoldGrams,
      assetType,
      goldGrams,
      goldValuation,
      transactionId,
      txnId,
      txnDate,
      description: logDesc,
      session,
    });
    if (ob) obligations.push(ob);
  }

  // Rule B: Receiver ≠ OnBehalfOf → Receiver owes OnBehalfOf (not for expense/wage)
  if (!same(receiverId, onBehalfOfId) && !NON_RECEIVABLE_TYPES.includes(transactionType)) {
    const ob = await upsertObligation({
      debtorId:    receiverId   ?? null,
      creditorId:  onBehalfOfId ?? null,
      effectiveMoney,
      pureGoldGrams,
      assetType,
      goldGrams,
      goldValuation,
      transactionId,
      txnId,
      txnDate,
      description: logDesc,
      session,
    });
    if (ob) obligations.push(ob);
  }

  return obligations;
}

export { findObligation as findExistingObligation };
