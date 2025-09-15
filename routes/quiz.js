import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Validation helper function
const validateQuizData = (data, isUpdate = false) => {
  const errors = [];
  
  if (!isUpdate || data.question !== undefined) {
    if (!data.question || typeof data.question !== 'string' || data.question.trim().length === 0) {
      errors.push('Question is required and must be a non-empty string');
    }
  }
  
  if (!isUpdate || data.options !== undefined) {
    if (!Array.isArray(data.options) || data.options.length === 0) {
      errors.push('Options must be a non-empty array');
    } else if (data.options.some(option => typeof option !== 'string' || option.trim().length === 0)) {
      errors.push('All options must be non-empty strings');
    }
  }
  
  if (!isUpdate || data.correctAnswer !== undefined) {
    if (!data.correctAnswer || typeof data.correctAnswer !== 'string' || data.correctAnswer.trim().length === 0) {
      errors.push('Correct answer is required and must be a non-empty string');
    }
  }
  
  if (!isUpdate || data.section !== undefined) {
    if (typeof data.section !== 'number' || data.section < 1) {
      errors.push('Section must be a positive number');
    }
  }
  
  if (data.supportingPic !== undefined && data.supportingPic !== null) {
    if (typeof data.supportingPic !== 'string' || data.supportingPic.trim().length === 0) {
      errors.push('Supporting picture must be a valid string URL');
    }
  }
  
  if (data.optionsContainImg !== undefined) {
    if (typeof data.optionsContainImg !== 'boolean') {
      errors.push('optionsContainImg must be a boolean');
    }
  }
  
  if (data.inActive !== undefined) {
    if (typeof data.inActive !== 'boolean') {
      errors.push('inActive must be a boolean');
    }
  }
  
  return errors;
};

// POST /api/quiz/create - Create a new quiz question
router.post('/create', requireAdmin, async (req, res) => {
  try {
    const { question, options, correctAnswer, section, supportingPic, optionsContainImg, inActive } = req.body;
    
    // Validate required fields
    const validationErrors = validateQuizData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }
    
    // Verify that correctAnswer is one of the options
    if (!options.includes(correctAnswer)) {
      return res.status(400).json({ 
        error: 'Correct answer must be one of the provided options' 
      });
    }
    
    const quiz = await prisma.quiz.create({
      data: {
        question: question.trim(),
        options: options.map(opt => opt.trim()),
        correctAnswer: correctAnswer.trim(),
        section,
        supportingPic: supportingPic?.trim() || null,
        optionsContainImg: optionsContainImg || false,
        inActive: inActive || false
      }
    });
    
    res.status(201).json({
      message: 'Quiz created successfully',
      quiz
    });
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Alias: GET /api/quiz -> same as /api/quiz/list (for frontend compatibility)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { section, inActive } = req.query;
    const where = {};

    if (section !== undefined) {
      const sectionNum = parseInt(section);
      if (isNaN(sectionNum)) {
        return res.status(400).json({ error: 'Section must be a valid number' });
      }
      where.section = sectionNum;
    }

    if (inActive !== undefined) {
      if (inActive === 'true') where.inActive = true;
      else if (inActive === 'false') where.inActive = false;
      else return res.status(400).json({ error: 'inActive must be true or false' });
    }

    const quizzes = await prisma.quiz.findMany({
      where,
      orderBy: [
        { section: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    res.json({
      message: 'Quizzes retrieved successfully',
      count: quizzes.length,
      quizzes
    });
  } catch (error) {
    console.error('Get quizzes (alias) error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/quiz/list - Get all quiz questions
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const { section, inActive } = req.query;
    
    // Build where clause based on query parameters
    const where = {};
    
    if (section !== undefined) {
      const sectionNum = parseInt(section);
      if (isNaN(sectionNum)) {
        return res.status(400).json({ error: 'Section must be a valid number' });
      }
      where.section = sectionNum;
    }
    
    if (inActive !== undefined) {
      if (inActive === 'true') {
        where.inActive = true;
      } else if (inActive === 'false') {
        where.inActive = false;
      } else {
        return res.status(400).json({ error: 'inActive must be true or false' });
      }
    }
    
    const quizzes = await prisma.quiz.findMany({
      where,
      orderBy: [
        { section: 'asc' },
        { createdAt: 'asc' }
      ]
    });
    
    res.json({
      message: 'Quizzes retrieved successfully',
      count: quizzes.length,
      quizzes
    });
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/quiz/:id - Update existing quiz
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid quiz ID format' });
    }
    
    // Check if quiz exists
    const existingQuiz = await prisma.quiz.findUnique({
      where: { id }
    });
    
    if (!existingQuiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    // Validate update data
    const validationErrors = validateQuizData(updateData, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }
    
    // If both options and correctAnswer are being updated, verify correctAnswer is in options
    if (updateData.options && updateData.correctAnswer) {
      if (!updateData.options.includes(updateData.correctAnswer)) {
        return res.status(400).json({ 
          error: 'Correct answer must be one of the provided options' 
        });
      }
    } else if (updateData.options && !updateData.correctAnswer) {
      // If only options are updated, verify existing correctAnswer is still valid
      if (!updateData.options.includes(existingQuiz.correctAnswer)) {
        return res.status(400).json({ 
          error: 'Updated options must include the current correct answer, or provide a new correct answer' 
        });
      }
    } else if (updateData.correctAnswer && !updateData.options) {
      // If only correctAnswer is updated, verify it's in existing options
      if (!existingQuiz.options.includes(updateData.correctAnswer)) {
        return res.status(400).json({ 
          error: 'New correct answer must be one of the existing options' 
        });
      }
    }
    
    // Prepare update data
    const dataToUpdate = {};
    if (updateData.question !== undefined) dataToUpdate.question = updateData.question.trim();
    if (updateData.options !== undefined) dataToUpdate.options = updateData.options.map(opt => opt.trim());
    if (updateData.correctAnswer !== undefined) dataToUpdate.correctAnswer = updateData.correctAnswer.trim();
    if (updateData.section !== undefined) dataToUpdate.section = updateData.section;
    if (updateData.supportingPic !== undefined) dataToUpdate.supportingPic = updateData.supportingPic?.trim() || null;
    if (updateData.optionsContainImg !== undefined) dataToUpdate.optionsContainImg = updateData.optionsContainImg;
    if (updateData.inActive !== undefined) dataToUpdate.inActive = updateData.inActive;
    
    const updatedQuiz = await prisma.quiz.update({
      where: { id },
      data: dataToUpdate
    });
    
    res.json({
      message: 'Quiz updated successfully',
      quiz: updatedQuiz
    });
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/quiz/:id - Delete quiz question
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid quiz ID format' });
    }
    
    // Check if quiz exists
    const existingQuiz = await prisma.quiz.findUnique({
      where: { id }
    });
    
    if (!existingQuiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    await prisma.quiz.delete({
      where: { id }
    });
    
    res.json({
      message: 'Quiz deleted successfully',
      deletedQuiz: {
        id: existingQuiz.id,
        question: existingQuiz.question
      }
    });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/quiz/section/:sectionNumber - Get quizzes by section
router.get('/section/:sectionNumber', authenticateToken, async (req, res) => {
  try {
    const sectionNumber = parseInt(req.params.sectionNumber);
    
    if (isNaN(sectionNumber) || sectionNumber < 1) {
      return res.status(400).json({ error: 'Section number must be a positive integer' });
    }
    
    const quizzes = await prisma.quiz.findMany({
      where: {
        section: sectionNumber,
        inActive: false // Only return active quizzes by default
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    res.json({
      message: `Quizzes for section ${sectionNumber} retrieved successfully`,
      section: sectionNumber,
      count: quizzes.length,
      quizzes
    });
  } catch (error) {
    console.error('Get quizzes by section error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Legacy routes (keeping for backward compatibility)

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
