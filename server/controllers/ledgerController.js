/**
 * LEDGER CONTROLLER (Thin)
 * Delegates all business logic to service files.
 */

import mongoose from "mongoose";
import LedgerTransaction      from "../models/LedgerTransaction.js";
import LedgerObligation       from "../models/LedgerObligation.js";
import LedgerTransactionGroup from "../models/LedgerTransactionGroup.js";
import { createTransaction, voidTransaction, getTransactions } from "../services/ledgerTransactionService.js";
import { settleObligation }   from "../services/ledgerSettlementService.js";
import { createGroup, getGroups, getGroupById } from "../services/ledgerGroupService.js";
import { getAllBalances, getContactBalance, getDashboardTotals } from "../services/ledgerBalanceService.js";

// ══════════════════════════════════════════════════════════════
// TRANSACTIONS
// ══════════════════════════════════════════════════════════════

export const createTransactionHandler = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await createTransaction(req.body, session);
    await session.commitTransaction();
    res.json({ success: true, ...result });
  } catch (err) {
    await session.abortTransaction();
    console.error("createTransaction error:", err);
    res.status(500).json({ success: false, message: err.message || "Transaction failed" });
  } finally {
    session.endSession();
  }
};

export const getTransactionsHandler = async (req, res) => {
  try {
    const { contactId, groupId, assetType, status, limit, skip } = req.query;
    const transactions = await getTransactions({
      contactId, groupId, assetType, status,
      limit: Number(limit) || 50,
      skip:  Number(skip)  || 0,
    });
    res.json({ success: true, transactions });
  } catch (err) {
    console.error("getTransactions error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch transactions" });
  }
};

export const getTransactionByIdHandler = async (req, res) => {
  try {
    const txn = await LedgerTransaction.findById(req.params.id)
      .populate("providerId",   "name categories")
      .populate("receiverId",   "name categories")
      .populate("onBehalfOfId", "name categories")
      .populate("groupId",      "title groupId")
      .populate("relatedObligationId");
    if (!txn) return res.status(404).json({ success: false, message: "Transaction not found" });
    res.json({ success: true, transaction: txn });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch transaction" });
  }
};

export const voidTransactionHandler = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await voidTransaction(req.params.id, req.body.reason, session);
    await session.commitTransaction();
    res.json({ success: true, ...result });
  } catch (err) {
    await session.abortTransaction();
    console.error("voidTransaction error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to void transaction" });
  } finally {
    session.endSession();
  }
};

// ══════════════════════════════════════════════════════════════
// GROUPS
// ══════════════════════════════════════════════════════════════

export const createGroupHandler = async (req, res) => {
  try {
    const result = await createGroup(req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("createGroup error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to create group" });
  }
};

export const getGroupsHandler = async (req, res) => {
  try {
    const { providerId, onBehalfOfId, limit, skip } = req.query;
    const groups = await getGroups({ providerId, onBehalfOfId, limit: Number(limit) || 50, skip: Number(skip) || 0 });
    res.json({ success: true, groups });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch groups" });
  }
};

export const getGroupByIdHandler = async (req, res) => {
  try {
    const group = await getGroupById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });
    res.json({ success: true, group });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch group" });
  }
};

// ══════════════════════════════════════════════════════════════
// OBLIGATIONS
// ══════════════════════════════════════════════════════════════

export const getObligationsHandler = async (req, res) => {
  try {
    const { contactId, debtorId, creditorId, assetType, status } = req.query;
    const query = {};

    if (contactId) {
      query.$or = [{ debtorId: contactId }, { creditorId: contactId }];
    } else {
      if (debtorId)   query.debtorId   = debtorId   === "OWNER" ? null : debtorId;
      if (creditorId) query.creditorId = creditorId === "OWNER" ? null : creditorId;
    }
    if (assetType) query.assetType = assetType;
    if (status)    query.status    = status;

    const obligations = await LedgerObligation.find(query)
      .populate("debtorId",            "name categories")
      .populate("creditorId",          "name categories")
      .populate("sourceTransactionIds","txnId transactionDate transactionType money gold")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, obligations });
  } catch (err) {
    console.error("getObligations error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch obligations" });
  }
};

export const getObligationByIdHandler = async (req, res) => {
  try {
    const obligation = await LedgerObligation.findById(req.params.id)
      .populate("debtorId",  "name categories phone")
      .populate("creditorId","name categories phone")
      .populate("sourceTransactionIds");
    if (!obligation) return res.status(404).json({ success: false, message: "Obligation not found" });
    res.json({ success: true, obligation });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch obligation" });
  }
};

export const settleObligationHandler = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const params = { obligationId: req.params.id, ...req.body };
    const result = await settleObligation(params, session);
    await session.commitTransaction();
    res.json({ success: true, ...result });
  } catch (err) {
    await session.abortTransaction();
    console.error("settleObligation error:", err);
    res.status(500).json({ success: false, message: err.message || "Settlement failed" });
  } finally {
    session.endSession();
  }
};

// ══════════════════════════════════════════════════════════════
// BALANCES (replaces old /ledger/contacts endpoint)
// ══════════════════════════════════════════════════════════════

export const getBalancesHandler = async (req, res) => {
  try {
    const [contacts, totals] = await Promise.all([
      getAllBalances(),
      getDashboardTotals(),
    ]);
    res.json({ success: true, contacts, totals });
  } catch (err) {
    console.error("getBalances error:", err);
    res.status(500).json({ success: false, message: "Failed to compute balances" });
  }
};

export const getContactBalanceHandler = async (req, res) => {
  try {
    const { contactId } = req.params;
    if (!contactId || !mongoose.Types.ObjectId.isValid(contactId)) {
      return res.status(400).json({ success: false, message: "Invalid contact ID" });
    }

    const balances = await getContactBalance(contactId);

    // Also fetch recent transactions and obligations for this contact
    const [transactions, obligations] = await Promise.all([
      getTransactions({ contactId, limit: 20 }),
      LedgerObligation.find({
        $or: [{ debtorId: contactId }, { creditorId: contactId }],
      })
        .populate("debtorId",  "name categories")
        .populate("creditorId","name categories")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    res.json({ success: true, balances, transactions, obligations });
  } catch (err) {
    console.error("getContactBalance error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch contact ledger" });
  }
};
