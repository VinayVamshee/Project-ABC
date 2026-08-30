/**
 * LEDGER GROUP SERVICE
 * Creates a batch "pay-on-behalf" group:
 * one provider → many recipients → on behalf of one party.
 * All transactions and the resulting obligation are created atomically.
 */

import mongoose from "mongoose";
import LedgerTransactionGroup from "../models/LedgerTransactionGroup.js";
import { createTransaction } from "./ledgerTransactionService.js";
import LedgerObligation from "../models/LedgerObligation.js";

/**
 * Create a transaction group with multiple recipients.
 *
 * @param {Object} groupData
 * @param {string}   groupData.title
 * @param {string}   groupData.description
 * @param {string}   groupData.transactionType  e.g. "wage"
 * @param {string|null} groupData.providerId    Who pays (null = Owner)
 * @param {string|null} groupData.onBehalfOfId  On behalf of whom (null = Owner)
 * @param {string}   groupData.assetType        "money" | "gold"
 * @param {string}   groupData.paymentMethod
 * @param {string}   groupData.groupDate
 * @param {Array}    groupData.recipients        [{ receiverId, amount, goldWeight, notes }]
 * @param {string}   groupData.notes
 */
export async function createGroup(groupData) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      title,
      description = "",
      transactionType = "other",
      providerId   = null,
      onBehalfOfId = null,
      assetType,
      paymentMethod = "Cash",
      groupDate,
      recipients = [],
      notes = "",
    } = groupData;

    if (!recipients || recipients.length === 0) {
      throw new Error("At least one recipient is required");
    }

    // 1. Create the group record first (without totals)
    const group = new LedgerTransactionGroup({
      title,
      description,
      transactionType,
      providerId:    providerId   || null,
      onBehalfOfId:  onBehalfOfId || null,
      transactionCount: recipients.length,
      groupDate: groupDate ? new Date(groupDate) : new Date(),
    });
    await group.save({ session });

    // 2. Create individual transactions
    let totalMoney = 0;
    let totalGold  = 0;
    const allObligations = [];

    for (const rec of recipients) {
      const { result } = await _createOneTransaction({
        transactionType,
        providerId:    providerId   || null,
        receiverId:    rec.receiverId || null,
        onBehalfOfId:  onBehalfOfId || null,
        assetType,
        money:    { amount: Number(rec.amount || 0), currency: "INR" },
        gold:     { weight: Number(rec.goldWeight || 0), purity: rec.goldPurity || "" },
        paymentMethod,
        groupId:  group._id,
        notes:    rec.notes || notes,
        description: `${title} — payment to recipient`,
      }, session);

      totalMoney += result.transaction.money.amount;
      totalGold  += result.transaction.gold.weight;
      allObligations.push(...result.obligations);
    }

    // 3. Update group totals
    group.totalMoneyAmount = totalMoney;
    group.totalGoldWeight  = totalGold;

    // Link the primary resulting obligation (provider≠onBehalfOf creates the main one)
    // All recipients' transactions contribute to the SAME obligation between
    // onBehalfOf and provider, so find it
    if (allObligations.length > 0) {
      // The obligation where onBehalfOf owes provider is the "main" group obligation
      const mainObligation = allObligations.find(ob => {
        const debtorMatch   = (ob.debtorId?.toString()  || null) === (onBehalfOfId || null);
        const creditorMatch = (ob.creditorId?.toString() || null) === (providerId   || null);
        return debtorMatch && creditorMatch;
      }) || allObligations[0];

      group.resultingObligationId = mainObligation._id;
    }

    await group.save({ session });
    await session.commitTransaction();

    return {
      group,
      transactionCount: recipients.length,
      totalMoney,
      totalGold,
    };

  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

// Internal helper that delegates to the transaction service within the same session
async function _createOneTransaction(data, session) {
  const { createTransaction: ct } = await import("./ledgerTransactionService.js");
  const result = await ct(data, session);
  return { result };
}

/**
 * Get all groups with their transaction count and summary.
 */
export async function getGroups({ providerId, onBehalfOfId, limit = 50, skip = 0 } = {}) {
  const query = { status: "active" };
  if (providerId)   query.providerId   = providerId;
  if (onBehalfOfId) query.onBehalfOfId = onBehalfOfId;

  return LedgerTransactionGroup.find(query)
    .populate("providerId",           "name categories")
    .populate("onBehalfOfId",         "name categories")
    .populate("resultingObligationId", "obligationId status money gold")
    .sort({ groupDate: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
}

/**
 * Get one group with all its child transactions.
 */
export async function getGroupById(id) {
  const LedgerTransaction = (await import("../models/LedgerTransaction.js")).default;

  const group = await LedgerTransactionGroup.findById(id)
    .populate("providerId",           "name categories")
    .populate("onBehalfOfId",         "name categories")
    .populate("resultingObligationId")
    .lean();

  if (!group) return null;

  const transactions = await LedgerTransaction.find({ groupId: id, status: "active" })
    .populate("receiverId",   "name categories")
    .populate("providerId",   "name categories")
    .populate("onBehalfOfId", "name categories")
    .sort({ transactionDate: -1 })
    .lean();

  return { ...group, transactions };
}
