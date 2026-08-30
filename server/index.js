import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import inventoryRoutes from "./routes/inventoryRoutes.js"
import orderRoutes from "./routes/orderRoutes.js"
import soldRoutes from "./routes/soldRoutes.js"
import authRoutes from "./routes/auth.routes.js"
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config();

const app = express();

// ✅ Middleware
app.use(express.json());
app.use(cookieParser());

// ✅ CORS FIX — allow frontend (React) to talk to backend
const allowedOrigins = [
    "https://abc-aneesh-buisness-console.vercel.app",
    "http://localhost:3000",
].filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(null, false);
            }
        },
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
        credentials: true,
    })
);

import { verifyToken } from "./middleware/auth.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";

import ratesRoutes from "./routes/ratesRoutes.js";
import ledgerRoutes from "./routes/ledgerRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";

// ✅ Register routes
app.use("/api/auth", authRoutes); // Auth must be public
app.use("/api/rates", ratesRoutes); // Public or protected depending on needs

// Protect all following routes
app.use("/api/inventory", verifyToken, inventoryRoutes);
app.use("/api/orders", verifyToken, orderRoutes);
app.use("/api/sold", verifyToken, soldRoutes);
app.use("/api/ledger", verifyToken, ledgerRoutes);
app.use("/api/contacts", verifyToken, contactRoutes);

// Default route
app.get("/", (req, res) => {
    res.send("ABC Server is running successfully 🚀");
});

// ✅ MongoDB connection
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("❌ MongoDB connection failed:", err.message));

// ✅ Global Error Handler
app.use(errorHandler);

// ✅ Start server
const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
