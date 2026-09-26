import express from "express";
import { generateFullBackup } from "../controllers/backupController.js";
const router = express.Router();
router.get("/backup", generateFullBackup);
export default router;
