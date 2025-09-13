import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session'; // Add this import
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import quizRoutes from './routes/quiz.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Frontend URL
const allowedOrigin = "https://www.quizzersclub.in";

// Enable CORS for frontend with credentials
app.use(
  cors({
    origin: allowedOrigin || "http://localhost:5173",
    credentials: true // allow cookies/auth headers
  })
);

// Parse JSON and cookies
app.use(express.json());
app.use(cookieParser());

// Session setup
app.use(
  session({
    secret: process.env.JWT_SECRET || 'default-secret', // use environment variable
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,    // JS cannot access cookie
      secure: true,      // HTTPS only
      sameSite: 'none'   // allow cross-origin cookies
    }
  })
);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/quiz', quizRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'QCM Backend is running!', timestamp: new Date().toISOString() });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'Backend connection working' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'QCM Backend API Server', 
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      test: '/api/test',
      auth: '/api/auth',
      user: '/api/user',
      quiz: '/api/quiz'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
