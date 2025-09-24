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
        contactNo: true,
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
    const { name, city, school, contactNo, class: userClass } = req.body;
    
    console.log('Profile PATCH request:', {
      userId: req.user.id,
      updateData: { name, city, school, contactNo, class: userClass }
    });
    
    const updateData = {};
    if (name) updateData.name = name;
    if (city) updateData.city = city;
    if (school) updateData.school = school;
    if (contactNo) updateData.contactNo = contactNo;
    if (userClass !== undefined) updateData.class = parseInt(userClass);

    console.log('Final update data:', updateData);

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
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

