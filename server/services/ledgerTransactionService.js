/**
 * LEDGER TRANSACTION SERVICE
 * Handles creating, voiding, and fetching individual transactions.
 * Calls the obligation engine after every create.
 */

import mongoose from "mongoose";
import LedgerTransaction from "../models/LedgerTransaction.js";
import { processTransaction } from "./obligationEngine.js";

/**
 * Create a single ledger transaction + run obligation engine.
 * Runs inside a MongoDB session for atomicity.
 */
export async function createTransaction(data, session) {
  const {
    transactionType,
    providerId,
    receiverId,
    onBehalfOfId,
    assetType,
    money,
    gold,
    goods,
    paymentMethod,
    groupId,
    description,
    notes,
    relatedSoldId,
    relatedOrderId,
  } = data;

  const txn = new LedgerTransaction({
    transactionDate: data.transactionDate || new Date(),
    transactionType,
    providerId:    providerId    || null,
    receiverId:    receiverId    || null,
    onBehalfOfId:  onBehalfOfId  || null,
    assetType,
    money: {
      amount:   Number(money?.amount   || 0),
      currency: money?.currency || "INR",
    },
    gold: {
      weight:      Number(gold?.weight      || 0),
      purity:      gold?.purity      || "",
      ratePerGram: Number(gold?.ratePerGram || 0),
      valuation:   Number(gold?.valuation   || 0),
    },
    goods: {
      description: goods?.description || "",
      quantity:    Number(goods?.quantity || 1),
      unit:        goods?.unit        || "piece",
      valuation:   Number(goods?.valuation || 0),
      inventoryId: goods?.inventoryId || null,
    },
    paymentMethod: paymentMethod || "Cash",
    groupId:       groupId       || null,
    description:   description   || "",
    notes:         notes         || "",
    relatedSoldId:  relatedSoldId  || null,
    relatedOrderId: relatedOrderId || null,
    status: "active",
  });

  await txn.save({ session });

  // Run obligation engine — creates/updates obligations atomically
  const obligations = await processTransaction(txn, session);

  // Link first resulting obligation back to transaction
  if (obligations.length > 0) {
    txn.relatedObligationId = obligations[0]._id;
    await txn.save({ session });
  }

  return { transaction: txn, obligations };
}

/**
 * Void a transaction.
 * Creates a correcting (reversal) transaction and updates affected obligations.
 */
export async function voidTransaction(txnId, reason, session) {
  const txn = await LedgerTransaction.findById(txnId).session(session);
  if (!txn) throw new Error("Transaction not found");
  if (txn.status === "void") throw new Error("Transaction is already void");

  txn.status     = "void";
  txn.voidReason = reason || "Voided by user";
  await txn.save({ session });

  // Create a reversal — same transaction but swapped provider/receiver
  const reversal = new LedgerTransaction({
    transactionType: "adjustment",
    providerId:    txn.receiverId,
    receiverId:    txn.providerId,
    onBehalfOfId:  txn.onBehalfOfId,
    assetType:     txn.assetType,
    money: {
      amount:   txn.money.amount,
      currency: txn.money.currency,
    },
    gold: {
      weight:      txn.gold.weight,
      purity:      txn.gold.purity,
      ratePerGram: txn.gold.ratePerGram,
      valuation:   txn.gold.valuation,
    },
    paymentMethod: txn.paymentMethod,
    description:   `Reversal of ${txn.txnId}: ${reason || "voided"}`,
    status: "active",
  });

  await reversal.save({ session });
  await processTransaction(reversal, session);

  return { voided: txn, reversal };
}

/**
 * Get transactions with optional filters + population + dual-query totals
 */
export async function getTransactions({ contactId, groupId, assetType, status, search, limit = 50, skip = 0, sortField = "transactionDate", sortOrder = "desc" } = {}) {
  const query = {};

  if (contactId) {
    query.$or = [
      { providerId:   contactId },
      { receiverId:   contactId },
      { onBehalfOfId: contactId },
    ];
  }
  if (groupId)    query.groupId    = groupId;
  if (assetType)  query.assetType  = assetType;
  if (status)     query.status     = status;
  else            query.status     = "active"; // default: exclude voided

  // 1. Get exact paginated items
  const transactions = await LedgerTransaction.find(query)
    .populate("providerId",   "name categories")
    .populate("receiverId",   "name categories")
    .populate("onBehalfOfId", "name categories")
    .populate("groupId",      "title groupId")
    .sort({ [sortField]: sortOrder === "asc" ? 1 : -1, _id: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // 2. Aggregate totals
  const totalsAgg = await LedgerTransaction.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalItems: { $sum: 1 },
        totalMoneyAmount: { $sum: { $cond: [{ $eq: ["$assetType", "money"] }, "$money.amount", 0] } },
        totalGoldWeight:  { $sum: { $cond: [{ $eq: ["$assetType", "gold"] }, "$gold.weight", 0] } },
        totalGoldValue:   { $sum: { $cond: [{ $eq: ["$assetType", "gold"] }, "$gold.valuation", 0] } }
      }
    }
  ]);

  const totals = totalsAgg[0] || {
    totalItems: 0,
    totalMoneyAmount: 0,
    totalGoldWeight: 0,
    totalGoldValue: 0
  };

  return { transactions, totals };
}
