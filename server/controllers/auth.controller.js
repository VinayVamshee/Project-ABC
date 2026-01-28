import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import staticUser from "../models/user.schema.js";

export const login = async (req, res) => {
  const { email, password } = req.body;

  // For now: email === username
  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  if (email !== staticUser.username) {
    return res.status(401).json({
      message: "Invalid credentials",
    });
  }

  const isMatch = bcrypt.compareSync(password, staticUser.passwordHash);

  if (!isMatch) {
    return res.status(401).json({
      message: "Invalid credentials",
    });
  }

  // Create JWT
  const token = jwt.sign(
    {
      username: staticUser.username,
      role: staticUser.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  // Send token as cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: false, // set true in production (HTTPS)
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    message: "Login successful",
    token,
  });
};
