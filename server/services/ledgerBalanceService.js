/**
 * LEDGER BALANCE SERVICE
 * Computes real-time balances from LedgerObligation records.
 * This is the SOURCE OF TRUTH — never cached on the contact model.
 *
 * null = Business Owner
 *
 * For each contact, calculates:
 *   moneyOwedToOwner  — contact is debtor, owner is creditor (they owe us)
 *   moneyOwnerOwes    — owner is debtor, contact is creditor (we owe them)
 *   goldOwedToOwner   — same pattern for gold
 *   goldOwnerOwes     — same pattern for gold
 */

import mongoose from "mongoose";
import LedgerObligation from "../models/LedgerObligation.js";
import BusinessContact from "../models/BusinessContact.js";

/**
 * Get balances for all contacts (for the dashboard).
 * Returns an array of contacts augmented with their balance data.
 */
export async function getAllBalances() {
  // Fetch all active obligations
  const obligations = await LedgerObligation.find({
    status: { $in: ["outstanding", "partially_settled"] },
  }).lean();

  // Build a map: contactId (string) → balances
  const balanceMap = {};

  const ensureEntry = (id) => {
    const key = id || "OWNER";
    if (!balanceMap[key]) {
      balanceMap[key] = {
        contactId:        id || null,
        moneyOwedToOwner: 0,
        moneyOwnerOwes:   0,
        goldOwedToOwner:  0,
        goldOwnerOwes:    0,
      };
    }
    return balanceMap[key];
  };

  for (const ob of obligations) {
    const debtorKey   = ob.debtorId?.toString()   || "OWNER";
    const creditorKey = ob.creditorId?.toString()  || "OWNER";

    // Only process obligations involving the owner (null)
    // i.e. one side is OWNER
    const ownerIsCreditor = !ob.creditorId; // creditor = null → owner is owed
    const ownerIsDebtor   = !ob.debtorId;   // debtor   = null → owner owes

    if (ownerIsCreditor) {
      // Contact (debtor) owes Owner (creditor)
      const entry = ensureEntry(ob.debtorId?.toString());
      if (ob.assetType === "money") entry.moneyOwedToOwner += ob.money.outstandingAmount;
      if (ob.assetType === "gold")  entry.goldOwedToOwner  += ob.gold.outstandingWeight;
    }

    if (ownerIsDebtor) {
      // Owner (debtor) owes Contact (creditor)
      const entry = ensureEntry(ob.creditorId?.toString());
      if (ob.assetType === "money") entry.moneyOwnerOwes += ob.money.outstandingAmount;
      if (ob.assetType === "gold")  entry.goldOwnerOwes  += ob.gold.outstandingWeight;
    }
  }

  // Fetch contacts that appear in the balance map (exclude OWNER entry)
  const contactIds = Object.keys(balanceMap)
    .filter(k => k !== "OWNER" && k !== "null")
    .map(k => k);

  const contacts = await BusinessContact.find({
    _id: { $in: contactIds },
  })
    .select("name businessName phone categories status")
    .lean();

  // Merge balance data onto contacts
  return contacts.map(c => ({
    ...c,
    balances: balanceMap[c._id.toString()] || {
      moneyOwedToOwner: 0,
      moneyOwnerOwes:   0,
      goldOwedToOwner:  0,
      goldOwnerOwes:    0,
    },
  }));
}

/**
 * Get balances for a single contact.
 */
export async function getContactBalance(contactId) {
  if (!contactId || contactId === "undefined" || contactId === "null" || !mongoose.Types.ObjectId.isValid(contactId)) {
    return {
      moneyOwedToOwner: 0,
      moneyOwnerOwes:   0,
      goldOwedToOwner:  0,
      goldOwnerOwes:    0,
    };
  }

  const obligations = await LedgerObligation.find({
    status: { $in: ["outstanding", "partially_settled"] },
    $or: [{ debtorId: contactId }, { creditorId: contactId }],
  }).lean();

  const balances = {
    moneyOwedToOwner: 0,
    moneyOwnerOwes:   0,
    goldOwedToOwner:  0,
    goldOwnerOwes:    0,
  };

  for (const ob of obligations) {
    const debtorIsContact   = ob.debtorId?.toString()   === contactId.toString();
    const creditorIsContact = ob.creditorId?.toString()  === contactId.toString();
    const creditorIsOwner   = !ob.creditorId;
    const debtorIsOwner     = !ob.debtorId;

    if (debtorIsContact && creditorIsOwner) {
      // Contact owes Owner
      if (ob.assetType === "money") balances.moneyOwedToOwner += ob.money.outstandingAmount;
      if (ob.assetType === "gold")  balances.goldOwedToOwner  += ob.gold.outstandingWeight;
    }

    if (debtorIsOwner && creditorIsContact) {
      // Owner owes Contact
      if (ob.assetType === "money") balances.moneyOwnerOwes += ob.money.outstandingAmount;
      if (ob.assetType === "gold")  balances.goldOwnerOwes  += ob.gold.outstandingWeight;
    }
  }

  return balances;
}

/**
 * Get dashboard summary totals across all contacts.
 */
export async function getDashboardTotals() {
  const obligations = await LedgerObligation.find({
    status: { $in: ["outstanding", "partially_settled"] },
  }).lean();

  const totals = {
    totalMoneyReceivable: 0,
    totalMoneyPayable:    0,
    totalGoldReceivable:  0,
    totalGoldPayable:     0,
  };

  for (const ob of obligations) {
    const creditorIsOwner = !ob.creditorId;
    const debtorIsOwner   = !ob.debtorId;

    if (creditorIsOwner) {
      // Owner is owed → receivable
      if (ob.assetType === "money") totals.totalMoneyReceivable += ob.money.outstandingAmount;
      if (ob.assetType === "gold")  totals.totalGoldReceivable  += ob.gold.outstandingWeight;
    }

    if (debtorIsOwner) {
      // Owner owes → payable
      if (ob.assetType === "money") totals.totalMoneyPayable += ob.money.outstandingAmount;
      if (ob.assetType === "gold")  totals.totalGoldPayable  += ob.gold.outstandingWeight;
    }
  }

  return totals;
}
