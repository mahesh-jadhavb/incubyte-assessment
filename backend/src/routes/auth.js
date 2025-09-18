const express = require('express');
const router = express.Router();
const db = require('../db');
const { hashPassword, comparePassword, signToken } = require('../utils');

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });
  const pw = hashPassword(password);
  try {
    const stmt = db.prepare('INSERT INTO users (name, email, password_hash, is_admin) VALUES (?, ?, ?, ?)');
    const info = stmt.run(name, email, pw, 0);
    const user = { id: info.lastInsertRowid, name, email, is_admin: 0 };
    const token = signToken({ sub: user.id, id: user.id, email: user.email, is_admin: user.is_admin });
    return res.status(201).json({ token, user });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ message: 'Email already exists' });
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Missing fields' });
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!row) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = comparePassword(password, row.password_hash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  const token = signToken({ sub: row.id, id: row.id, email: row.email, is_admin: !!row.is_admin });
  return res.json({ token, user: { id: row.id, name: row.name, email: row.email, is_admin: !!row.is_admin } });
});

module.exports = router;
