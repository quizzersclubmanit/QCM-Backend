import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        userId: true,
        contactNo: true,
        city: true,
        school: true,
        docId: true,
        createdAt: true
      }
    });

    res.json({
      user: {
        ...user,
        $id: user.userId
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.patch('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, city, school, contactNo } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (city) updateData.city = city;
    if (school) updateData.school = school;
    if (contactNo) updateData.contactNo = contactNo;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        userId: true,
        contactNo: true,
        city: true,
        school: true,
        docId: true
      }
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        ...updatedUser,
        $id: updatedUser.userId
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Get user quiz score 
router.get('/score', authenticateToken, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.id; // Allow passing userId as a query parameter
console.log("User ID:", userId);
    // Check if the user has a quiz score record
    const userScores = await prisma.quizScore.findMany({
      where: {
        userId: userId,
      },
    });

    // Calculate total score from all sections
    const totalScore = userScores.reduce((sum, score) => sum + score.score, 0);

    // If no scores are found, return a null score
    if (userScores.length === 0) {
      return res.json({ score: null });
    }

    res.json({
      score: totalScore,
    });
  } catch (error) {
    console.error('Get user score error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
export default router;
