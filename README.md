# QCM Prisma Backend

A Node.js backend server using Prisma ORM with MongoDB for the QCM (Quizzers' Club MANIT) application.

## Setup Instructions

### 1. Install Dependencies
```bash
cd Prisma-Backend
npm install
```



**Note**: Make sure your `.env` file uses `JWT_SECRET` (not `JET_SECRET`)

### 3. Database Setup
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Open Prisma Studio to view/edit data
npm run db:studio
```

### 4. Start the Server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout
- `PATCH /api/auth/phone` - Update phone number

### User Management
- `GET /api/user/profile` - Get user profile
- `PATCH /api/user/profile` - Update user profile

### Quiz Management
- `GET /api/quiz/section/:section` - Get quizzes by section
- `POST /api/quiz/score` - Submit quiz score
- `GET /api/quiz/leaderboard` - Get leaderboard

## Database Models

### User
- Email, name, password (hashed)
- Contact number, city, school
- Unique userId for compatibility
- Created/updated timestamps

### QuizScore
- User reference, score, section
- Quiz ID, disqualification status
- Created timestamp

### Quiz
- Question, options, correct answer
- Section, supporting picture
- Image options flag, active status
- Created/updated timestamps

## Features

- JWT-based authentication with HTTP-only cookies
- Password hashing with bcrypt
- CORS enabled for frontend integration
- Error handling middleware
- MongoDB integration via Prisma ORM
- User profile management
- Quiz score tracking
- Leaderboard functionality
