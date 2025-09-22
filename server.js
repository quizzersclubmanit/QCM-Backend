import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import MongoDBStore from 'connect-mongodb-session';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import quizRoutes from './routes/quiz.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB session store setup
const MongoDBStoreSession = MongoDBStore(session);
const store = new MongoDBStoreSession({
  uri: process.env.DATABASE_URL || 'mongodb://localhost:27017/qcm',
  collection: 'sessions',
  expires: 1000 * 60 * 60 * 24 * 30, // 30 days
  connectionOptions: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
});

// Catch session store errors
store.on('error', function (error) {
  console.error('Session store error:', error);
});

const allowedOrigins = [
  'https://www.quizzersclub.in',  // production
  'http://localhost:5173',        // local dev
  'http://127.0.0.1:5173'         // local dev (alternate)
];

// CORS configuration
// const corsOptions = {
//   origin: function (origin, callback) {
//     if (!origin) return callback(null, true);

//     if (allowedOrigins.indexOf(origin) === -1) {
//       const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
//       return callback(new Error(msg), false);
//     }
//     return callback(null, true);
//   },
//   credentials: true,
//   allowedHeaders: [
//     'Content-Type',
//     'Authorization',
//     'x-access-token',
//     'token',
//     'X-Requested-With',
//     'Accept',
//     'Origin',
//     'cache-control'
//   ],
//   exposedHeaders: ['set-cookie'],
//   methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
//   preflightContinue: false,
//   optionsSuccessStatus: 200
// };
const corsOptions = {
  origin: allowedOrigins, // explicitly allow frontend
  credentials: true,
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Cache-Control"
  ],
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  optionsSuccessStatus: 200
};


app.use(cors(corsOptions));

// Explicitly handle preflight
app.options('*', cors(corsOptions));


// Parse JSON and cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'your-secret-key-here'));

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      domain: process.env.NODE_ENV === 'production' ? '.quizzersclub.in' : undefined,
      path: '/'
    },
    name: 'qcm.sid',
    rolling: true // Reset the maxAge on every request
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

// Debug auth endpoint
app.get('/api/debug/auth', (req, res) => {
  res.json({
    headers: req.headers,
    cookies: req.cookies,
    signedCookies: req.signedCookies,
    authorization: req.headers.authorization,
    timestamp: new Date().toISOString()
  });
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
