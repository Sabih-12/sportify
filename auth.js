const jwt = require('jsonwebtoken');
const User = require('./models/User');

const SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

async function generateToken(user) {
  return jwt.sign({ id: user._id, email: user.email, role: user.role }, SECRET, { expiresIn: '4h' });
}

function authMiddleware(requiredRole) {
  return async (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
    const token = auth.slice(7);
    try {
      const payload = jwt.verify(token, SECRET);
      req.user = payload;
      if (requiredRole && payload.role !== requiredRole) return res.status(403).json({ message: 'Forbidden' });
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
}

module.exports = { generateToken, authMiddleware };
