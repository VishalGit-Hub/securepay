# Payment Checkout

Multi-step payment form with SQLite storage and an admin dashboard.

## Run

```bash
npm install
npm start          # http://localhost:3000
```

## Pages

| Path     | Description |
| -------- | ----------- |
| `/`      | Step 1: name, email, amount → **Pay Now** → Step 2: card number, name on card, expiry, CVV → Step 3: thank you |
| `/admin` | Dashboard listing every stored transaction (Basic auth) |

## Environment variables

| Name         | Default             | Description |
| ------------ | ------------------- | ----------- |
| `PORT`       | `3000`              | HTTP port |
| `DB_FILE`    | `transactions.sqlite` | SQLite file path |
| `ADMIN_USER` | `admin`             | Admin dashboard username |
| `ADMIN_PASS` | `admin123`          | Admin dashboard password |

## Data

Everything is written to the `transactions` table in the SQLite file: name, email, amount,
card number, name on card, expiry, CVV, status and timestamp.

Validation runs both client- and server-side: email format, amount > 0, Luhn check on the card
number, non-expired MM/YY expiry, and a brand-aware CVV length (4 for Amex, otherwise 3).

Test cards that pass the Luhn check: `4242 4242 4242 4242` (Visa),
`5555 5555 5555 4444` (Mastercard), `3782 822463 10005` (Amex).

## Security note

This is a demo. Storing raw PANs and CVVs is prohibited by PCI DSS — a production system should
hand card data to a payment provider (Stripe, Adyen, …) and persist only a token plus the last
four digits.
