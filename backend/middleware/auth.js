const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');

function signToken(user) {
  return jwt.sign({ id: String(user._id), role: user.role }, config.JWT_SECRET, { expiresIn: '7d' });
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) return res.status(401).json({ success: false, error: 'Authentication required' });
  let decoded;
  try {
    decoded = jwt.verify(match[1], config.JWT_SECRET);
  } catch (_err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
  try {
    const user = await User.findById(decoded.id)
      .select('-passwordHash -nationalIdEncrypted -nationalIdHash -payoutAccountEncrypted')
      .lean();
    if (!user) return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden: insufficient role' });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole, signToken };
