import crypto from 'crypto';

/**
 * Generate a deterministic HMAC-SHA256 signature for a registration code.
 * Ensures the pass URL cannot be guessed or enumerated by changing pass numbers.
 *
 * @param {string} registrationCode - e.g. "QBIT-26-0118"
 * @returns {string} 16-character hex token
 */
export function generatePassToken(registrationCode) {
  const secret = process.env.JWT_SECRET || 'QCM@1234';
  const cleanCode = (registrationCode || '').trim().toUpperCase();
  return crypto.createHmac('sha256', secret).update(cleanCode).digest('hex').slice(0, 16);
}

/**
 * Verify whether an attendee's token matches the expected signature.
 *
 * @param {string} registrationCode
 * @param {string} token
 * @returns {boolean}
 */
export function verifyPassToken(registrationCode, token) {
  if (!token || typeof token !== 'string' || token.trim().length !== 16) return false;
  const expected = generatePassToken(registrationCode);
  try {
    return crypto.timingSafeEqual(Buffer.from(token.trim()), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Mask an email for public display (e.g. "r••••••@gmail.com")
 *
 * @param {string} email
 * @returns {string}
 */
export function maskEmail(email) {
  if (!email || !email.includes('@')) return '••••••••';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}•@${domain}`;
  return `${local[0]}${'•'.repeat(Math.min(local.length - 2, 6))}${local[local.length - 1]}@${domain}`;
}

/**
 * Mask a phone number for public display (e.g. "+91 99534 •••••")
 *
 * @param {string} phone
 * @returns {string}
 */
export function maskPhone(phone) {
  if (!phone) return '—';
  const digits = String(phone).replace(/\D/g, '').slice(-10);
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} •••••`;
  }
  return '••••••••••';
}
