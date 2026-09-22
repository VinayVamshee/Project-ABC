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

// ✅ MongoDB connection (Serverless Optimized)
let isConnected = false;
let connectionPromise = null;

const connectDB = async () => {
    if (isConnected) return;
    if (connectionPromise) {
        await connectionPromise;
        return;
    }

    try {
        connectionPromise = mongoose.connect(process.env.MONGO_URI);
        const db = await connectionPromise;
        isConnected = db.connections[0].readyState === 1;
        console.log("✅ MongoDB connected (Serverless mode)");
    } catch (err) {
        console.error("❌ MongoDB connection failed:", err.message);
        connectionPromise = null;
    }
};

// Middleware to ensure DB connection on every request
app.use(async (req, res, next) => {
    await connectDB();
    next();
});


// ✅ Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

// ✅ CORS FIX — allow frontend (React) to talk to backend
const allowedOrigins = [
    "https://abc-aneesh-buisness-console.vercel.app",
    "http://localhost:3000"
].filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            if (
                !origin ||
                allowedOrigins.includes(origin) ||
                origin.endsWith(".vercel.app") ||
                origin.includes("localhost") ||
                origin.includes("127.0.0.1")
            ) {
                callback(null, true);
            } else {
                callback(null, false);
            }
        },
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
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



// ✅ Global Error Handler
app.use(errorHandler);

// ✅ Start server (Only if not running on Vercel)
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    const PORT = process.env.PORT;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

export default app;
