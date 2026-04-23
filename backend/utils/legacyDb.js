import crypto from 'crypto';

export function toSqliteDateTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function hashSha1(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex');
}

export function normaliseDbPaymentMethod(method) {
  const normalized = String(method || 'cash').toLowerCase();

  if (normalized === 'card') {
    return 'KARTU';
  }

  if (normalized === 'transfer') {
    return 'TRANSFER';
  }

  return 'TUNAI';
}

export function normaliseAppPaymentMethod(method) {
  const normalized = String(method || 'TUNAI').toUpperCase();

  if (normalized === 'KARTU') {
    return 'card';
  }

  if (normalized === 'TRANSFER') {
    return 'transfer';
  }

  return 'cash';
}

export function calculateDiscountedPrice(originalPrice, discountPercent) {
  const price = Number(originalPrice || 0);
  const discount = Number(discountPercent || 0);

  return price - (price * discount) / 100;
}

export function isActiveLegacyUser(statusUser) {
  return String(statusUser || '').toLowerCase() === 'aktif';
}
