import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import inputFieldRoutes from "./routes/inputFieldRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js"
import orderRoutes from "./routes/orderRoutes.js"
import soldRoutes from "./routes/soldRoutes.js"
import authRoutes from "./routes/auth.routes.js"

dotenv.config();
const app = express();

// ✅ Middleware
app.use(express.json());
app.use(cookieParser());

// ✅ CORS FIX — allow frontend (React) to talk to backend
const allowedOrigins = [
    "https://abc-aneesh-buisness-console.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
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

// ✅ Register routes
app.use("/api/fields", inputFieldRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/sold", soldRoutes);
app.use("/api/auth", authRoutes);

// Default route
app.get("/", (req, res) => {
    res.send("ABC Server is running successfully 🚀");
});

// ✅ MongoDB connection
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("❌ MongoDB connection failed:", err.message));

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
