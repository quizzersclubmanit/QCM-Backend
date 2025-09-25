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
        phoneNo: true, // Fixed: contactNo -> phoneNo
        city: true,
        school: true,
        class: true,
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
    console.log('PATCH /api/user/profile called');
    console.log('Request user:', req.user);
    console.log('Request body:', req.body);
    
    const { name, city, school, phoneNo, class: userClass } = req.body; // Fixed: contactNo -> phoneNo
    
    if (!req.user || !req.user.id) {
      console.error('No user or user ID in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    console.log('Profile PATCH request:', {
      userId: req.user.id,
      updateData: { name, city, school, phoneNo, class: userClass } // Fixed: contactNo -> phoneNo
    });
    
    const updateData = {};
    if (name) updateData.name = name;
    if (city) updateData.city = city;
    if (school) updateData.school = school;
    if (phoneNo) updateData.phoneNo = phoneNo; // Fixed: contactNo -> phoneNo
    if (userClass !== undefined) {
      const parsedClass = parseInt(userClass);
      if (isNaN(parsedClass)) {
        return res.status(400).json({ error: 'Class must be a valid number' });
      }
      updateData.class = parsedClass;
    }

    console.log('Final update data:', updateData);

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        userId: true,
        phoneNo: true, // Fixed: contactNo -> phoneNo
        city: true,
        school: true,
        class: true,
        docId: true
      }
    });

    console.log('User updated successfully:', updatedUser);

    res.json({
      message: 'Profile updated successfully',
      user: {
        ...updatedUser,
        $id: updatedUser.userId
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.get('/score', authenticateToken, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.id; // Allow passing userId as a query parameter

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
