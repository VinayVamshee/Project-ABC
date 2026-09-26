import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

// Simple in-memory rate limiting for login
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

const failAttempt = (ip, res) => {
  if (ip) {
    const attempt = loginAttempts.get(ip) || { count: 0, lockoutUntil: 0 };
    attempt.count += 1;
    if (attempt.count >= MAX_ATTEMPTS) {
      attempt.lockoutUntil = Date.now() + LOCKOUT_MS;
    }
    loginAttempts.set(ip, attempt);
  }
  return res.status(401).json({ message: "Invalid credentials" });
};

// Seed initial admin user if DB is empty
export const seedAdminUser = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const passwordHash = bcrypt.hashSync("ANee12345", 10);
      await User.create({
        username: "SVLJ1983",
        passwordHash,
        role: "admin",
      });
      console.log("✅ Seeded initial admin user SVLJ1983 into database");
    }
  } catch (err) {
    console.error("Failed to seed admin user:", err);
  }
};

export const login = async (req, res) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  
  if (ip) {
    const attempt = loginAttempts.get(ip) || { count: 0, lockoutUntil: 0 };
    if (attempt.lockoutUntil > Date.now()) {
      return res.status(429).json({ message: "Too many failed attempts. Try again in 15 minutes." });
    }
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  const inputUser = email.trim();

  // Handle case insensitivity securely
  const user = await User.findOne({ username: { $regex: new RegExp("^" + inputUser + "$", "i") } });

  if (!user) {
    return failAttempt(ip, res);
  }

  const isMatch = bcrypt.compareSync(password, user.passwordHash);

  if (!isMatch) {
    return failAttempt(ip, res);
  }

  if (ip) loginAttempts.delete(ip);

  const jwtSecret = process.env.JWT_SECRET || "aneesh_business_console_secret_key_2026";
  const token = jwt.sign(
    {
      userId: user._id,
      username: user.username,
      role: user.role,
    },
    jwtSecret,
    { expiresIn: "30d" }
  );

  const isProd = process.env.NODE_ENV === "production";

  // Send token as cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    message: "Login successful",
    token,
    role: user.role,
    user: {
      username: user.username,
      role: user.role,
    },
  });
};

export const logout = async (req, res) => {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
  });

  return res.status(200).json({ message: "Logged out successfully" });
};
