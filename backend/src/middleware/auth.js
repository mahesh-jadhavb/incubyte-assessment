const { verifyToken } = require('../utils');

function authMiddleware(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing token' });
  const token = auth.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ message: 'Invalid token' });
  req.user = payload; // payload should include id and is_admin
  next();
}

function adminOnly(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Missing auth' });
  if (!req.user.is_admin) return res.status(403).json({ message: 'Admin only' });
  next();
}

module.exports = { authMiddleware, adminOnly };
