const PHONE_REGEX = /^\+?[0-9]{8,15}$/;

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, '').trim();
}

export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(normalizePhone(phone));
}

export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
