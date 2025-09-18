const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}
function comparePassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

module.exports = { hashPassword, comparePassword, signToken, verifyToken };
