const path = require('path');
const express = require('express');
const db = require('./db');
const { validatePayment, detectBrand } = require('./validation');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const [user, pass] = Buffer.from(encoded, 'base64').toString('utf8').split(':');
    if (user === ADMIN_USER && pass === ADMIN_PASS) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Admin dashboard"');
  res.status(401).send('Authentication required');
}

const insertTransaction = db.prepare(`
  INSERT INTO transactions (name, email, amount, card_number, card_name, expiry, cvv, status)
  VALUES (@name, @email, @amount, @cardNumber, @cardName, @expiry, @cvv, 'success')
`);

app.post('/api/pay', (req, res) => {
  const { valid, errors, value } = validatePayment(req.body);
  if (!valid) return res.status(400).json({ ok: false, errors });

  const info = insertTransaction.run(value);
  res.status(201).json({
    ok: true,
    transaction: {
      id: info.lastInsertRowid,
      name: value.name,
      email: value.email,
      amount: value.amount,
      brand: detectBrand(value.cardNumber),
      last4: value.cardNumber.slice(-4),
    },
  });
});

app.get('/api/transactions', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM transactions ORDER BY id DESC').all();
  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  res.json({
    ok: true,
    count: rows.length,
    total,
    transactions: rows.map((r) => ({ ...r, brand: detectBrand(r.card_number) })),
  });
});

app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = app;
