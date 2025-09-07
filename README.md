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

