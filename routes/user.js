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
import { authenticateToken, requireStaff, requireAdmin } from '../middleware/auth.js';

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
        role: true,
        phoneNo: true,
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
    const { name, city, school, phoneNo, contactNo } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (city) updateData.city = city;
    if (school) updateData.school = school;
    const phone = phoneNo || contactNo;
    if (phone) updateData.phoneNo = phone;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        userId: true,
        role: true,
        phoneNo: true,
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

    const userScores = await prisma.quizScore.findMany({
      where: { userId: String(userId) },
      select: {
        score: true,
        section: true,
        createdAt: true,
        disqualified: true
      }
    });

    if (userScores.length === 0) {
      return res.json({
        message: 'No scores found for this user.',
        totalScore: 0,
        scores: []
      });
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

/* ==========================================================================
   CLUB STAFF & ROLES MANAGEMENT
   ========================================================================== */

// GET /api/user/staff - List all staff & club members (or filter by role / search)
router.get('/staff', requireStaff, async (req, res) => {
  try {
    const { search, role } = req.query;

    const where = {};
    if (role && role !== 'ALL') {
      where.role = role.toUpperCase();
    }
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phoneNo: true,
        city: true,
        school: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Provide role breakdown counts
    const roleCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    });

    const counts = {};
    roleCounts.forEach((r) => {
      counts[r.role || 'USER'] = r._count.id;
    });

    res.json({ success: true, users, roleCounts: counts });
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Failed to fetch staff members' });
  }
});

// POST /api/user/staff/assign - Assign role by email or user ID
router.post('/staff/assign', requireAdmin, async (req, res) => {
  try {
    const { email, userId, role } = req.body;
    const VALID_ROLES = ['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'COORDINATOR', 'MEMBER', 'USER'];

    if (!role || !VALID_ROLES.includes(role.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    const normalizedRole = role.toUpperCase();

    let user;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    } else if (email) {
      user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    } else {
      return res.status(400).json({ error: 'Email or User ID is required' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found in system' });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: normalizedRole },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phoneNo: true,
      },
    });

    res.json({
      success: true,
      message: `Assigned role ${normalizedRole} to ${updated.name || updated.email}`,
      user: updated,
    });
  } catch (error) {
    console.error('Assign role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// PATCH /api/user/staff/:id/role - Update specific user role
router.patch('/staff/:id/role', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const VALID_ROLES = ['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'COORDINATOR', 'MEMBER', 'USER'];

    if (!role || !VALID_ROLES.includes(role.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    const normalizedRole = role.toUpperCase();

    const updated = await prisma.user.update({
      where: { id },
      data: { role: normalizedRole },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phoneNo: true,
      },
    });

    res.json({
      success: true,
      message: `Role updated to ${normalizedRole}`,
      user: updated,
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

export default router;
