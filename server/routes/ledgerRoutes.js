import express from "express";
import {
  createTransactionHandler,
  getTransactionsHandler,
  getTransactionByIdHandler,
  voidTransactionHandler,
  createGroupHandler,
  getGroupsHandler,
  getGroupByIdHandler,
  getObligationsHandler,
  getObligationByIdHandler,
  settleObligationHandler,
  writeOffObligationHandler,
  getBalancesHandler,
  getContactBalanceHandler,
} from "../controllers/ledgerController.js";

const router = express.Router();

// ── Transactions ───────────────────────────────────────────
router.get("/transactions",         getTransactionsHandler);
router.post("/transactions",        createTransactionHandler);
router.get("/transactions/:id",     getTransactionByIdHandler);
router.patch("/transactions/:id/void", voidTransactionHandler);

// ── Groups (batch pay-on-behalf) ───────────────────────────
router.get("/groups",               getGroupsHandler);
router.post("/groups",              createGroupHandler);
router.get("/groups/:id",           getGroupByIdHandler);

// ── Obligations ────────────────────────────────────────────
router.get("/obligations",          getObligationsHandler);
router.get("/obligations/:id",      getObligationByIdHandler);
router.post("/obligations/:id/settle",   settleObligationHandler);
router.post("/obligations/:id/writeoff", writeOffObligationHandler);

// ── Balances (replaces old /ledger/contacts) ───────────────
router.get("/balances",             getBalancesHandler);
router.get("/balances/:contactId",  getContactBalanceHandler);

export default router;
