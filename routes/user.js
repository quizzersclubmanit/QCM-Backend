// import express from 'express';
// import prisma from '../lib/prisma.js';
// import { authenticateToken } from '../middleware/auth.js';

// const router = express.Router();

// // Get user profile
// router.get('/profile', authenticateToken, async (req, res) => {
//   try {
//     const user = await prisma.user.findUnique({
//       where: { id: req.user.id },
//       select: {
//         id: true,
//         email: true,
//         name: true,
//         userId: true,
//         contactNo: true,
//         city: true,
//         school: true,
//         docId: true,
//         createdAt: true
//       }
//     });

//     res.json({
//       user: {
//         ...user,
//         $id: user.userId
//       }
//     });
//   } catch (error) {
//     console.error('Get profile error:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // Update user profile
// router.patch('/profile', authenticateToken, async (req, res) => {
//   try {
//     const { name, city, school, contactNo } = req.body;
    
//     const updateData = {};
//     if (name) updateData.name = name;
//     if (city) updateData.city = city;
//     if (school) updateData.school = school;
//     if (contactNo) updateData.contactNo = contactNo;

//     const updatedUser = await prisma.user.update({
//       where: { id: req.user.id },
//       data: updateData,
//       select: {
//         id: true,
//         email: true,
//         name: true,
//         userId: true,
//         contactNo: true,
//         city: true,
//         school: true,
//         docId: true
//       }
//     });

//     res.json({
//       message: 'Profile updated successfully',
//       user: {
//         ...updatedUser,
//         $id: updatedUser.userId
//       }
//     });
//   } catch (error) {
//     console.error('Update profile error:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// export default router;

import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { ObjectId } from 'mongodb'; 

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
// Get user's quiz scores
router.get('/scores', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; 
    // Convert the string userId to an ObjectId
    const mongoUserId = new ObjectId(userId);

    // Find all quiz scores for the user using the correct ObjectId
    const userScores = await prisma.quizScore.findMany({
      where: { userId: mongoUserId },
      select: {
        score: true,
        section: true,
        createdAt: true,
        disqualified: true
      }
    });

    // If no scores are found, return a message
    if (userScores.length === 0) {
      return res.status(404).json({ message: 'No scores found for this user.' });
    }

    // Calculate the total score
    const totalScore = userScores.reduce((sum, score) => sum + score.score, 0);

    // Return the scores and total score
    res.json({
      message: 'User scores retrieved successfully.',
      totalScore: totalScore,
      scores: userScores
    });
  } catch (error) {
    console.error('Get scores error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
export default router;
