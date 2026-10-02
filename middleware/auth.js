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
        role: true,
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

const ADMIN_EMAILS = [
  'admin@quizzersclub.in',
  'quizzersclub@gmail.com',
  'admin@qcm.in',
  'admin@qcm.com',
  'admin@admin.com',
];

const isUserAdmin = (user) => {
  if (!user) return false;
  const email = String(user.email || '').toLowerCase().trim();
  const role = String(user.role || '').toUpperCase().trim();
  return (
    ADMIN_EMAILS.includes(email) ||
    user.name === 'admin' ||
    ['ADMIN', 'SUPER_ADMIN'].includes(role)
  );
};

const isUserStaff = (user) => {
  if (!user) return false;
  if (isUserAdmin(user)) return true;
  const role = String(user.role || '').toUpperCase().trim();
  return ['ORGANIZER', 'COORDINATOR', 'MEMBER'].includes(role);
};

// Admin authorization middleware (strictly admins & super admins)
const requireAdmin = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (!isUserAdmin(req.user)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin privileges required for this operation'
      });
    }
    next();
  });
};

// Staff authorization middleware (admins, organizers, and event coordinators)
const requireStaff = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (!isUserStaff(req.user)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Club staff privileges required for this operation'
      });
    }
    next();
  });
};

export { authenticateToken, requireAdmin, requireStaff, isUserAdmin, isUserStaff };
