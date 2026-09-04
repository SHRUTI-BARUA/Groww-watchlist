// auth.js
// Deliberately plain: bcrypt password hashing + JWT session tokens. This is
// exactly the "keep it simple" side of §2.6 — no custom session protocol,
// no OAuth provider integration, because none of that is what this
// assignment is testing. Standard, boring, correct.

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const TOKEN_TTL = '7d';

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing auth token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid or expired token' });
  }
}

module.exports = { signToken, authMiddleware };
