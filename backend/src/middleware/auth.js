// Auth middleware
const jwt = require('jsonwebtoken');
const { isBlocklisted } = require('./tokenBlocklist');

const JWT_SECRET = process.env.JWT_SECRET;

const auth = async (req, res, next) => {
  try {
    if (!JWT_SECRET) {
      console.error('JWT_SECRET is not configured.');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error.',
      });
    }

    const authHeader =
      req.headers.authorization || req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token missing.',
      });
    }

    const token = authHeader.split(' ')[1]?.trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token malformed.',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }

    // Reject blocklisted tokens
    if (isBlocklisted(token)) {
      return res.status(401).json({
        success: false,
        message: 'Token has been invalidated. Please log in again.',
      });
    }

    // Attach decoded token to request
    req.user = decoded;

    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please login again.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.',
    });
  }
};

// Admin check
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized.',
    });
  }

  const adminRoles = ['super_admin', 'admin', 'editor'];

  const isAdminUser =
    req.user.type === 'admin' ||
    req.user.isAdmin === true ||
    adminRoles.includes(req.user.role);

  if (!isAdminUser) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.',
    });
  }

  return next();
};

// Super admin check
const isSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized.',
    });
  }

  if (req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super admin privileges required.',
    });
  }

  return next();
};

// Editor check
const isEditor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized.',
    });
  }

  const editorRoles = ['super_admin', 'admin', 'editor'];

  if (!editorRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Editor privileges required.',
    });
  }

  return next();
};

// Role-based access
const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }

    // Normalize to array
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}.`,
      });
    }

    return next();
  };
};

module.exports = auth;
module.exports.default = auth;
module.exports.isAdmin = isAdmin;
module.exports.isSuperAdmin = isSuperAdmin;
module.exports.isEditor = isEditor;
module.exports.requireRole = requireRole;