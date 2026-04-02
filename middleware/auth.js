// middleware/auth.js
const { verifyToken } = require('../utils/jwt');

/**
 * Middleware to verify JWT token from request headers
 * Protects routes that require authentication
 */
const authenticateToken = (req, res, next) => {
  try {
    // Extract token from Authorization header
    // Format: "Bearer TOKEN"
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Attach user info to request object for use in routes
    req.user = {
      userId: decoded.userId,
      email: decoded.email
    };

    next(); // Proceed to the next middleware/route handler
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    return res.status(403).json({
      success: false,
      message: error.message || 'Invalid or expired token'
    });
  }
};

/**
 * Optional middleware for routes that work with or without authentication
 * Attaches user info if token is valid, but doesn't block access
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyToken(token);
      req.user = {
        userId: decoded.userId,
        email: decoded.email
      };
    }
    next();
  } catch (error) {
    // Silently fail - user is not authenticated but can still proceed
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};
