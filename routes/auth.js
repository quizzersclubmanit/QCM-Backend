import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import prisma from "../prismaClient.js"; // your prisma client
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
  domain: process.env.NODE_ENV === "production" ? ".quizzersclub.in" : undefined,
};

// Generate JWT token
const generateToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });

/**
 * Signup
 */
router.post("/signup", async (req, res) => {
  try {
    const { email, password, name, phoneNo, city, school, sex } = req.body;
    if (!email || !password || !name || !phoneNo || !city || !school || !sex) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, phoneNo, city, school, sex, userId: uuidv4() },
      select: { id: true, email: true, name: true, userId: true, phoneNo: true, city: true, school: true, sex: true }
    });

    const token = generateToken(user.id);

    // Set JWT cookie (optional, useful for getCurrentUser if needed)
    res.cookie("token", token, { ...COOKIE_OPTIONS, maxAge: 30 * 24 * 60 * 60 * 1000 });

    // Create session
    req.session.userId = user.id;

    return res.status(201).json({ message: "User created successfully", user: { ...user, $id: user.userId } });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Login
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

    const token = generateToken(user.id);
    res.cookie("token", token, { ...COOKIE_OPTIONS, maxAge: 30 * 24 * 60 * 60 * 1000 });

    req.session.userId = user.id;

    return res.json({ message: "Login successful", user: { ...user, $id: user.userId }, token });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Logout
 */
router.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ error: "Failed to logout" });
    }

    // Clear cookies
    res.clearCookie("qcm.sid", COOKIE_OPTIONS);
    res.clearCookie("token", COOKIE_OPTIONS);

    return res.json({ message: "Logged out successfully" });
  });
});

/**
 * Get current user
 */
router.get("/me", async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.json({ user: null });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, userId: true, phoneNo: true, city: true, school: true, sex: true }
    });

    if (!user) return res.json({ user: null });

    return res.json({ user });
  } catch (err) {
    console.error("Auth/me error:", err);
    return res.json({ user: null });
  }
});

export default router;
