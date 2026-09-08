const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function luhnValid(digits) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum > 0 && sum % 10 === 0;
}

function detectBrand(digits) {
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^6(011|5)/.test(digits)) return 'Discover';
  return 'Card';
}

function validatePayment(body) {
  const errors = {};

  const name = String(body.name || '').trim();
  if (name.length < 2) errors.name = 'Enter your full name';

  const email = String(body.email || '').trim();
  if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address';

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Enter an amount greater than 0';
  else if (amount > 1000000) errors.amount = 'Amount is too large';

  const cardNumber = String(body.cardNumber || '').replace(/\D/g, '');
  if (cardNumber.length < 13 || cardNumber.length > 19 || !luhnValid(cardNumber)) {
    errors.cardNumber = 'Enter a valid card number';
  }

  const cardName = String(body.cardName || '').trim();
  if (cardName.length < 2) errors.cardName = 'Enter the name on the card';

  const expiry = String(body.expiry || '').trim();
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(expiry);
  if (!m) {
    errors.expiry = 'Use MM/YY format';
  } else {
    const month = Number(m[1]);
    const year = 2000 + Number(m[2]);
    const now = new Date();
    const endOfMonth = new Date(year, month, 1);
    if (month < 1 || month > 12) errors.expiry = 'Invalid month';
    else if (endOfMonth <= now) errors.expiry = 'Card has expired';
  }

  const cvv = String(body.cvv || '').trim();
  const cvvLen = detectBrand(cardNumber) === 'Amex' ? 4 : 3;
  if (!new RegExp(`^\\d{${cvvLen}}$`).test(cvv)) {
    errors.cvv = `CVV must be ${cvvLen} digits`;
  }

  return {
    errors,
    valid: Object.keys(errors).length === 0,
    value: { name, email, amount, cardNumber, cardName, expiry: m ? `${m[1]}/${m[2]}` : expiry, cvv },
  };
}

module.exports = { validatePayment, luhnValid, detectBrand };
