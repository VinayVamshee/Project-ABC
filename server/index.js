import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import inputFieldRoutes from "./routes/inputFieldRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js"
import orderRoutes from "./routes/orderRoutes.js"
import soldRoutes from "./routes/soldRoutes.js"

dotenv.config();
const app = express();

// ✅ Middleware
app.use(express.json());
app.use(cookieParser());

// ✅ CORS FIX — allow frontend (React) to talk to backend
app.use(
    cors({
        origin: "https://abc-aneesh-buisness-console.vercel.app", 
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
        credentials: true,
    })
);

// ✅ Register routes
app.use("/api/fields", inputFieldRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/sold", soldRoutes);

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
