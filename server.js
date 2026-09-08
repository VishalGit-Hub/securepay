const path = require('path');
const express = require('express');
const { db, ready } = require('./db');
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

const INSERT_SQL = `
  INSERT INTO transactions (name, email, amount, card_number, card_name, expiry, cvv, status)
  VALUES (:name, :email, :amount, :cardNumber, :cardName, :expiry, :cvv, 'success')
`;

app.post('/api/pay', async (req, res, next) => {
  const { valid, errors, value } = validatePayment(req.body);
  if (!valid) return res.status(400).json({ ok: false, errors });

  try {
    await ready;
    const info = await db.execute({ sql: INSERT_SQL, args: value });
    res.status(201).json({
      ok: true,
      transaction: {
        id: Number(info.lastInsertRowid),
        name: value.name,
        email: value.email,
        amount: value.amount,
        brand: detectBrand(value.cardNumber),
        last4: value.cardNumber.slice(-4),
      },
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/transactions', requireAdmin, async (req, res, next) => {
  try {
    await ready;
    const { rows } = await db.execute('SELECT * FROM transactions ORDER BY id DESC');
    const transactions = rows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      email: r.email,
      amount: r.amount,
      card_number: r.card_number,
      card_name: r.card_name,
      expiry: r.expiry,
      cvv: r.cvv,
      status: r.status,
      created_at: r.created_at,
      brand: detectBrand(r.card_number),
    }));
    res.json({
      ok: true,
      count: transactions.length,
      total: transactions.reduce((sum, t) => sum + t.amount, 0),
      transactions,
    });
  } catch (err) {
    next(err);
  }
});

app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ ok: false, errors: { form: 'Something went wrong. Please try again.' } });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = app;
