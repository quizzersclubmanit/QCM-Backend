import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

const authenticateToken = async (req, res, next) => {
  try {
    // Lightweight debug logging
    if (process.env.NODE_ENV !== 'production') {
      console.log('Auth headers:', req.headers && req.headers.authorization ? 'Authorization present' : 'No Authorization');
    }

    // Robust token extraction supporting multiple headers/cookies
    const extractToken = (req) => {
      let t = null;
      const hdrAuth = req.headers['authorization'] || req.headers['Authorization'];
      if (hdrAuth) {
        if (typeof hdrAuth === 'string' && hdrAuth.startsWith('Bearer ')) {
          t = hdrAuth.slice(7).trim();
        } else if (typeof hdrAuth === 'string') {
          t = hdrAuth.trim();
        }
      }
      if (!t && req.headers['x-access-token']) t = String(req.headers['x-access-token']).trim();
      if (!t && req.headers['token']) t = String(req.headers['token']).trim();
      if (!t) {
        const cookieToken = req.cookies?.token || req.signedCookies?.token || req.cookies?.accessToken || req.cookies?.authToken;
        if (cookieToken) t = String(cookieToken).trim();
      }
      return t || null;
    };

    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'NO AUTHENTICATION TOKEN PROVIDED'
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
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Admin authorization middleware
const requireAdmin = async (req, res, next) => {
  try {
    // First authenticate the token
    await new Promise((resolve, reject) => {
      authenticateToken(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Check if user has admin privileges
    // For now, we'll check if the user email contains 'admin' or is a specific admin email
    // You can modify this logic based on your admin identification system
    const adminEmails = [
      'admin@quizzersclub.in',
      'quizzersclub@gmail.com',
      'admin@qcm.in',
      // Add more admin emails as needed
    ];
    
    const isAdmin = adminEmails.includes(req.user.email) || 
                   req.user.email.includes('admin') ||
                   req.user.email.includes('quizzersclub');

    if (!isAdmin) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin privileges required for this operation'
      });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

export { authenticateToken, requireAdmin };
