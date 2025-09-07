import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get quizzes by section
router.get('/section/:section', authenticateToken, async (req, res) => {
  try {
    const section = parseInt(req.params.section);
    
    const quizzes = await prisma.quiz.findMany({
      where: {
        section: section,
        inActive: false
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    res.json(quizzes);
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit quiz score
router.post('/score', authenticateToken, async (req, res) => {
  try {
    const { score, section, quizId } = req.body;
    
    if (typeof score !== 'number' || typeof section !== 'number') {
      return res.status(400).json({ error: 'Score and section must be numbers' });
    }

    const quizScore = await prisma.quizScore.create({
      data: {
        userId: req.user.id,
        score,
        section,
        quizId
      }
    });

    res.json({
      message: 'Score submitted successfully',
      quizScore
    });
  } catch (error) {
    console.error('Submit score error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const scores = await prisma.quizScore.findMany({
      where: {
        disqualified: false
      },
      include: {
        user: {
          select: {
            name: true,
            userId: true,
            city: true,
            school: true
          }
        }
      },
      orderBy: {
        score: 'desc'
      }
    });

    // Group by user and get highest score
    const userScores = new Map();
    scores.forEach(score => {
      const userId = score.user.userId;
      if (!userScores.has(userId) || userScores.get(userId).score < score.score) {
        userScores.set(userId, {
          ...score.user,
          score: score.score,
          userId: userId
        });
      }
    });

    const leaderboard = Array.from(userScores.values())
      .sort((a, b) => b.score - a.score);

    res.json(leaderboard);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
