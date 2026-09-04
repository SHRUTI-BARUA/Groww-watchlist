const express = require('express');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const db = require('../db');
const { signToken } = require('../auth');

const router = express.Router();

const findUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const insertUser = db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)');
const insertWatchlist = db.prepare('INSERT INTO watchlists (id, user_id, name, created_at) VALUES (?, ?, ?, ?)');

router.post('/register', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: 'email and password (min 6 chars) are required' });
  }
  if (findUserByEmail.get(email)) {
    return res.status(409).json({ error: 'an account with this email already exists' });
  }

  const id = nanoid();
  const passwordHash = bcrypt.hashSync(password, 10);
  insertUser.run(id, email, passwordHash, Date.now());

  // Every new user gets a default watchlist so "create and manage a
  // watchlist" has something to land on immediately after signup.
  const watchlistId = nanoid();
  insertWatchlist.run(watchlistId, id, 'My Watchlist', Date.now());

  const token = signToken({ id, email });
  res.status(201).json({ token, user: { id, email }, defaultWatchlistId: watchlistId });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = findUserByEmail.get(email);
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'invalid email or password' });
  }
  const token = signToken(user);
  res.json({ token, user: { id: user.id, email: user.email } });
});

module.exports = router;
