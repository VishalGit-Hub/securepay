const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');
const submitBtn = document.getElementById('submitPay');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
let details = { name: '', email: '', amount: 0 };

const usd = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function setStep(n) {
  step1.classList.toggle('hidden', n !== 1);
  step2.classList.toggle('hidden', n !== 2);
  step3.classList.toggle('hidden', n !== 3);
  document.querySelectorAll('.step').forEach((el) => {
    const s = Number(el.dataset.step);
    el.classList.toggle('active', s === n);
    el.classList.toggle('done', s < n);
  });
}

function showErrors(form, errors) {
  form.querySelectorAll('.error').forEach((el) => { el.textContent = ''; });
  form.querySelectorAll('input').forEach((el) => el.classList.remove('invalid'));
  Object.entries(errors).forEach(([field, message]) => {
    const slot = form.querySelector(`.error[data-for="${field}"]`);
    if (slot) slot.textContent = message;
    const input = form.querySelector(`[name="${field}"]`);
    if (input) input.classList.add('invalid');
  });
}

function luhnValid(digits) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    double = !double;
  }
  return sum > 0 && sum % 10 === 0;
}

const isAmex = (digits) => /^3[47]/.test(digits);

// ---- Step 1 ----
step1.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = step1.name.value.trim();
  const email = step1.email.value.trim();
  const amount = Number(step1.amount.value.replace(/[^\d.]/g, ''));
  const errors = {};
  if (name.length < 2) errors.name = 'Enter your full name';
  if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address';
  if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Enter an amount greater than 0';
  showErrors(step1, errors);
  if (Object.keys(errors).length) return;

  details = { name, email, amount: Math.round(amount * 100) / 100 };
  document.getElementById('summary').innerHTML =
    `Paying <b>${usd(details.amount)}</b> as <b>${details.name}</b> (${details.email})`;
  submitBtn.textContent = `Pay ${usd(details.amount)}`;
  setStep(2);
  step2.cardNumber.focus();
});

// ---- Step 2 input formatting ----
step2.cardNumber.addEventListener('input', (e) => {
  const digits = e.target.value.replace(/\D/g, '').slice(0, 19);
  e.target.value = isAmex(digits)
    ? digits.replace(/^(\d{4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' '))
    : digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  step2.cvv.maxLength = isAmex(digits) ? 4 : 3;
});

step2.expiry.addEventListener('input', (e) => {
  const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
  e.target.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
});

step2.cvv.addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, isAmex(step2.cardNumber.value.replace(/\D/g, '')) ? 4 : 3);
});

document.getElementById('back').addEventListener('click', () => setStep(1));

// ---- Step 2 submit ----
step2.addEventListener('submit', async (e) => {
  e.preventDefault();
  const cardNumber = step2.cardNumber.value.replace(/\D/g, '');
  const cardName = step2.cardName.value.trim();
  const expiry = step2.expiry.value.trim();
  const cvv = step2.cvv.value.trim();

  const errors = {};
  if (cardNumber.length < 13 || cardNumber.length > 19 || !luhnValid(cardNumber)) {
    errors.cardNumber = 'Enter a valid card number';
  }
  if (cardName.length < 2) errors.cardName = 'Enter the name on the card';
  const m = /^(\d{2})\/(\d{2})$/.exec(expiry);
  if (!m) {
    errors.expiry = 'Use MM/YY format';
  } else {
    const month = Number(m[1]);
    if (month < 1 || month > 12) errors.expiry = 'Invalid month';
    else if (new Date(2000 + Number(m[2]), month, 1) <= new Date()) errors.expiry = 'Card has expired';
  }
  const cvvLen = isAmex(cardNumber) ? 4 : 3;
  if (cvv.length !== cvvLen) errors.cvv = `CVV must be ${cvvLen} digits`;

  showErrors(step2, errors);
  if (Object.keys(errors).length) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing…';
  try {
    const res = await fetch('/api/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...details, cardNumber, cardName, expiry, cvv }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      showErrors(step2, data.errors || { form: 'Payment failed. Please try again.' });
      return;
    }
    const t = data.transaction;
    document.getElementById('thanksText').textContent =
      `${usd(t.amount)} paid successfully with ${t.brand} ending ${t.last4}.`;
    document.getElementById('receipt').textContent =
      `Transaction #${t.id} — a receipt was sent to ${t.email}`;
    step2.reset();
    setStep(3);
  } catch (err) {
    showErrors(step2, { form: 'Network error. Please try again.' });
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = `Pay ${usd(details.amount)}`;
  }
});

document.getElementById('again').addEventListener('click', () => {
  step1.reset();
  showErrors(step1, {});
  showErrors(step2, {});
  setStep(1);
});
