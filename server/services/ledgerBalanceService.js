/**
 * LEDGER BALANCE SERVICE
 * Computes real-time balances from unified LedgerObligation records.
 *
 * null = Business Owner
 *
 * moneyOwedToOwner  — contact is debtor, owner is creditor (they owe us ₹)
 * moneyOwnerOwes    — owner is debtor, contact is creditor (we owe them ₹)
 * goldOwedToOwner   — contact owes us pure gold grams
 * goldOwnerOwes     — we owe them pure gold grams
 */

import mongoose from "mongoose";
import LedgerObligation from "../models/LedgerObligation.js";
import BusinessContact  from "../models/BusinessContact.js";

export async function getAllBalances() {
  const obligations = await LedgerObligation.find({
    status: { $in: ["outstanding", "partially_settled"] },
  }).lean();

  const balanceMap = {};
  const ensureEntry = (id) => {
    const key = id || "OWNER";
    if (!balanceMap[key]) {
      balanceMap[key] = {
        contactId:                id   || null,
        moneyOwedToOwner:         0,
        moneyOwnerOwes:           0,
        goldOwedToOwner:          0,
        goldOwnerOwes:            0,
        goldOwedToOwnerValuation: 0,
        goldOwnerOwesValuation:   0,
      };
    }
    return balanceMap[key];
  };

  for (const ob of obligations) {
    const ownerIsCreditor = !ob.creditorId; // creditor = null → owner is owed
    const ownerIsDebtor   = !ob.debtorId;   // debtor   = null → owner owes

    if (ownerIsCreditor) {
      const entry = ensureEntry(ob.debtorId?.toString());
      entry.moneyOwedToOwner += ob.moneyBalance || 0;
      entry.goldOwedToOwner  += ob.goldBalance  || 0;
      entry.goldOwedToOwnerValuation += ob.goldBalanceValuation || 0;
    }

    if (ownerIsDebtor) {
      const entry = ensureEntry(ob.creditorId?.toString());
      entry.moneyOwnerOwes += ob.moneyBalance || 0;
      entry.goldOwnerOwes  += ob.goldBalance  || 0;
      entry.goldOwnerOwesValuation += ob.goldBalanceValuation || 0;
    }
  }

  const contactIds = Object.keys(balanceMap)
    .filter(k => k !== "OWNER" && k !== "null");

  const contacts = await BusinessContact.find({ _id: { $in: contactIds } })
    .select("name businessName phone categories status")
    .lean();

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

export async function getContactBalance(contactId) {
  if (!contactId || !mongoose.Types.ObjectId.isValid(contactId)) {
    return { moneyOwedToOwner: 0, moneyOwnerOwes: 0, goldOwedToOwner: 0, goldOwnerOwes: 0 };
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
    goldOwedToOwnerValuation: 0,
    goldOwnerOwesValuation:   0,
  };

  for (const ob of obligations) {
    const debtorIsContact   = ob.debtorId?.toString()  === contactId.toString();
    const creditorIsContact = ob.creditorId?.toString() === contactId.toString();
    const creditorIsOwner   = !ob.creditorId;
    const debtorIsOwner     = !ob.debtorId;

    if (debtorIsContact && creditorIsOwner) {
      balances.moneyOwedToOwner += ob.moneyBalance || 0;
      balances.goldOwedToOwner  += ob.goldBalance  || 0;
      balances.goldOwedToOwnerValuation += ob.goldBalanceValuation || 0;
    }

    if (debtorIsOwner && creditorIsContact) {
      balances.moneyOwnerOwes += ob.moneyBalance || 0;
      balances.goldOwnerOwes  += ob.goldBalance  || 0;
      balances.goldOwnerOwesValuation += ob.goldBalanceValuation || 0;
    }
  }

  return balances;
}

export async function getDashboardTotals() {
  const obligations = await LedgerObligation.find({
    status: { $in: ["outstanding", "partially_settled"] },
  }).lean();

  const totals = {
    totalMoneyReceivable:         0,
    totalMoneyPayable:            0,
    totalGoldReceivable:          0,
    totalGoldPayable:             0,
    totalGoldReceivableValuation: 0,
    totalGoldPayableValuation:    0,
  };

  for (const ob of obligations) {
    const creditorIsOwner = !ob.creditorId;
    const debtorIsOwner   = !ob.debtorId;

    if (creditorIsOwner) {
      totals.totalMoneyReceivable         += ob.moneyBalance || 0;
      totals.totalGoldReceivable          += ob.goldBalance  || 0;
      totals.totalGoldReceivableValuation += ob.goldBalanceValuation || 0;
    }

    if (debtorIsOwner) {
      totals.totalMoneyPayable         += ob.moneyBalance || 0;
      totals.totalGoldPayable          += ob.goldBalance  || 0;
      totals.totalGoldPayableValuation += ob.goldBalanceValuation || 0;
    }
  }

  return totals;
}
