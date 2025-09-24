// import express from "express";
// import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";
// import { v4 as uuidv4 } from "uuid";
// import prisma from "../lib/prisma.js"; // your prisma client

// const router = express.Router();

// const COOKIE_OPTIONS = {
//   httpOnly: false,
//   secure: process.env.NODE_ENV === "production",
//   sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
//   path: "/",
//   domain: process.env.NODE_ENV === "production" ? ".quizzersclub.in" : undefined,
// };

// // Generate JWT token
// const generateToken = (userId) =>
//   jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });

// /**
//  * Signup
//  */
// router.post("/signup", async (req, res) => {
//   try {
//     const { email, password, name, phoneNo, city, school, sex } = req.body;
//     if (!email || !password || !name || !phoneNo || !city || !school || !sex) {
//       return res.status(400).json({ error: "All fields are required" });
//     }

//     const existingUser = await prisma.user.findUnique({ where: { email } });
//     if (existingUser) return res.status(400).json({ error: "User already exists" });

//     const hashedPassword = await bcrypt.hash(password, 12);

//     const user = await prisma.user.create({
//       data: {
//         email,
//         password: hashedPassword,
//         name,
//         phoneNo,
//         city,
//         school,
//         sex,
//         userId: uuidv4(),
//       },
//       select: {
//         id: true,
//         email: true,
//         name: true,
//         userId: true,
//         phoneNo: true,
//         city: true,
//         school: true,
//         sex: true,
//       },
//     });

//     const token = generateToken(user.id);

//     // Set JWT cookie
//     res.cookie("token", token, { ...COOKIE_OPTIONS, maxAge: 30 * 24 * 60 * 60 * 1000 });

//     return res
//       .status(201)
//       .json({ message: "User created successfully", user: { ...user, $id: user.userId } });
//   } catch (err) {
//     console.error("Signup error:", err);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// });

// /**
//  * Login
//  */
// router.post("/login", async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     if (!email || !password)
//       return res.status(400).json({ error: "Email and password are required" });

//     const user = await prisma.user.findUnique({ where: { email } });
//     if (!user) return res.status(401).json({ error: "Invalid credentials" });

//     const isValid = await bcrypt.compare(password, user.password);
//     if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

//     const token = generateToken(user.id);
//     res.cookie("token", token, { ...COOKIE_OPTIONS, maxAge: 30 * 24 * 60 * 60 * 1000 });

//     const { password: _, ...userWithoutPassword } = user;

//     return res.json({
//       message: "Login successful",
//       user: { ...userWithoutPassword, $id: user.userId },
//     });
//   } catch (err) {
//     console.error("Login error:", err);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// });

// /**
//  * Logout
//  */
// router.post("/logout", (req, res) => {
//   // Just clear the cookie
//   res.clearCookie("token", COOKIE_OPTIONS);
//   return res.json({ message: "Logged out successfully" });
// });

// /**
//  * Get current user
//  */
// router.get("/me", async (req, res) => {
//   try {
//     const token = req.cookies.token;
//     if (!token) return res.json({ user: null });

//     let payload;
//     try {
//       payload = jwt.verify(token, process.env.JWT_SECRET);
//     } catch (err) {
//       return res.json({ user: null });
//     }

//     const user = await prisma.user.findUnique({
//       where: { id: payload.userId },
//       select: {
//         id: true,
//         email: true,
//         name: true,
//         userId: true,
//         phoneNo: true,
//         city: true,
//         school: true,
//         sex: true,
//       },
//     });

//     if (!user) return res.json({ user: null });

//     return res.json({ user });
//   } catch (err) {
//     console.error("Auth/me error:", err);
//     return res.json({ user: null });
//   }
// });

// export default router;


import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import emailService from '../lib/emailService.js';

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Signup route
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, phoneNo, city, school, sex } = req.body;
    
    // Debug: Log the received data
    console.log('Signup request body:', {
      email,
      password: password ? '***' : undefined,
      name,
      phoneNo,
      city,
      school,
      sex,
      fullBody: req.body
    });
    
    // Use phone if contactNo is not provided (for frontend compatibility)
    // const phoneNumber = contactNo || phone;

    // Validation
    if (!email || !password || !name || !phoneNo || !city || !school || !sex) {
      console.log('Validation failed - missing fields:', {
        email: !!email,
        password: !!password,
        name: !!name,
        phoneNo: !!phoneNo,
        city: !!city,
        school: !!school,
        sex: !!sex
      });
      return res.status(400).json({ error: 'All fields are required: email, password, name, phoneNo, city, school, sex' });
    }

    if (name.toLowerCase() === 'admin') {
      return res.status(400).json({ error: 'Name is reserved. Please enter another name' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        phoneNo,
        city,
        school,
        sex,
        userId: uuidv4()
      },
      select: {
        id: true,
        email: true,
        name: true,
        userId: true,
        phoneNo: true,
        city: true,
        school: true,
        sex: true,
        createdAt: true
      }
    });

    // Generate token
    const token = generateToken(user.id);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      message: 'Login successful',
      token, // expose JWT so frontend can store and send as Bearer
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        userId: user.userId,
        phoneNo: user.phoneNo,
        city: user.city,
        school: user.school,
        sex: user.sex,
        docId: user.docId,
        $id: user.userId // For compatibility with existing frontend
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user.id);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      message: 'Login successful',
      token, // expose JWT so frontend can store and send as Bearer
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        userId: user.userId,
        phoneNo: user.phoneNo,
        city: user.city,
        school: user.school,
        sex: user.sex,
        docId: user.docId,
        $id: user.userId // For compatibility with existing frontend
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: {
        ...req.user,
        $id: req.user.userId // For compatibility with existing frontend
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logout successful' });
});

// Update phone number
router.patch('/phone', authenticateToken, async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { phoneNo: `+91${phone}` },
      select: {
        id: true,
        email: true,
        name: true,
        userId: true,
        phoneNo: true,
        city: true,
        school: true,
        sex: true,
        docId: true
      }
    });

    res.json({
      message: 'Phone number updated successfully',
      user: {
        ...updatedUser,
        $id: updatedUser.userId
      }
    });
  } catch (error) {
    console.error('Update phone error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot password route
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If the email exists, a password reset link has been sent' });
    }

    // Generate secure reset token
    const resetToken = emailService.generateResetToken(user.id, user.email);

    // Send password reset email
    await emailService.sendPasswordResetEmail(user.email, resetToken);

    res.json({ message: 'If the email exists, a password reset link has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password route
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Verify and decode the reset token
    let decoded;
    try {
      decoded = emailService.verifyResetToken(token);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Find user by ID from token
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || user.email !== decoded.email) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test email configuration (development only)
router.get('/test-email', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: 'Not found' });
    }

    const result = await emailService.testEmailConfig();
    res.json(result);
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

