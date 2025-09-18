const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// POST /api/sweets - admin only (create sweet)
router.post('/', authMiddleware, adminOnly, (req, res) => {
  const { name, category, price, quantity } = req.body;
  if (!name || !category || price == null || quantity == null) return res.status(400).json({ message: 'Missing fields' });
  const stmt = db.prepare('INSERT INTO sweets (name, category, price, quantity) VALUES (?, ?, ?, ?)');
  const info = stmt.run(name, category, Number(price), Number(quantity));
  const sweet = db.prepare('SELECT * FROM sweets WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(sweet);
});

// GET /api/sweets - list all (protected)
router.get('/', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM sweets ORDER BY id DESC').all();
  res.json(rows);
});

// GET /api/sweets/search
router.get('/search', authMiddleware, (req, res) => {
  const { name, category, minPrice, maxPrice } = req.query;
  let query = 'SELECT * FROM sweets WHERE 1=1';
  const params = [];
  if (name) {
    query += ' AND name LIKE ?';
    params.push(`%${name}%`);
  }
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (minPrice) {
    query += ' AND price >= ?';
    params.push(Number(minPrice));
  }
  if (maxPrice) {
    query += ' AND price <= ?';
    params.push(Number(maxPrice));
  }
  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

// PUT /api/sweets/:id - admin only
router.put('/:id', authMiddleware, adminOnly, (req, res) => {
  const id = req.params.id;
  const { name, category, price, quantity } = req.body;
  const stmt = db.prepare('UPDATE sweets SET name = ?, category = ?, price = ?, quantity = ? WHERE id = ?');
  stmt.run(name, category, Number(price), Number(quantity), id);
  const sweet = db.prepare('SELECT * FROM sweets WHERE id = ?').get(id);
  res.json(sweet);
});

// DELETE /api/sweets/:id - admin only
router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  const id = req.params.id;
  db.prepare('DELETE FROM sweets WHERE id = ?').run(id);
  res.json({ message: 'Deleted' });
});

// POST /api/sweets/:id/purchase - decrease quantity
router.post('/:id/purchase', authMiddleware, (req, res) => {
  const id = req.params.id;
  const { quantity } = req.body;
  if (!quantity || quantity <= 0) return res.status(400).json({ message: 'Invalid quantity' });
  const sweet = db.prepare('SELECT * FROM sweets WHERE id = ?').get(id);
  if (!sweet) return res.status(404).json({ message: 'Sweet not found' });
  if (sweet.quantity < quantity) return res.status(400).json({ message: 'Insufficient stock' });
  const newQ = sweet.quantity - quantity;
  const update = db.prepare('UPDATE sweets SET quantity = ? WHERE id = ?').run(newQ, id);
  const total = Number((quantity * sweet.price).toFixed(2));
  db.prepare('INSERT INTO purchases (user_id, sweet_id, quantity, total_price) VALUES (?, ?, ?, ?)')
    .run(req.user.id, id, quantity, total);
  const updated = db.prepare('SELECT * FROM sweets WHERE id = ?').get(id);
  res.json({ success: true, sweet: updated, total });
});

// POST /api/sweets/:id/restock - admin only
router.post('/:id/restock', authMiddleware, adminOnly, (req, res) => {
  const id = req.params.id;
  const { quantity } = req.body;
  if (!quantity || quantity <= 0) return res.status(400).json({ message: 'Invalid quantity' });
  const sweet = db.prepare('SELECT * FROM sweets WHERE id = ?').get(id);
  if (!sweet) return res.status(404).json({ message: 'Sweet not found' });
  const newQ = sweet.quantity + Number(quantity);
  db.prepare('UPDATE sweets SET quantity = ? WHERE id = ?').run(newQ, id);
  const updated = db.prepare('SELECT * FROM sweets WHERE id = ?').get(id);
  res.json({ success: true, sweet: updated });
});

module.exports = router;
