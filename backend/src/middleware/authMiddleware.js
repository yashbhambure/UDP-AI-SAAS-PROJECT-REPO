const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * authMiddleware — protects routes by verifying JWT in the Authorization header.
 * Attaches the authenticated User model instance to req.user.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Access denied. Malformed token.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user in database to ensure they still exist and token isn't stale
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Access denied. User no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    logger.warn(`Auth failure: ${err.message}`);
    return res.status(401).json({ error: 'Access denied. Invalid or expired token.' });
  }
};

module.exports = authMiddleware;
