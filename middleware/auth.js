import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

const authenticateToken = async (req, res, next) => {
  try {
    // Try to get token from cookies first, then from Authorization header
    let token = req.cookies?.token || req.signedCookies?.token;
    
    // If no token in cookies, check Authorization header
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer ' from the token
      }
    }
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'No authentication token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        userId: true,
        phoneNo: true,
        city: true,
        school: true,
        sex: true,
        docId: true
      }
    });

    if (!user) {
      // Clear any invalid tokens
      res.clearCookie('token');
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'The provided token is invalid or expired'
      });
    }

    // Attach user to request
    req.user = user;
    
    // Refresh the session cookie (extend its lifetime)
    if (req.session) {
      req.session.lastActivity = Date.now();
    }
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export { authenticateToken };

