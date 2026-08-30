import express from "express";
import { getLiveRates } from "../controllers/ratesController.js";

const router = express.Router();

router.get("/", getLiveRates);

export default router;
