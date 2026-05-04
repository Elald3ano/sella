export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function isValidPhone(phone: string): boolean {
  const digits = normalizePhone(phone);
  return digits.length >= 7;
}

export function validatePhone(phone: string): string | null {
  const digits = normalizePhone(phone);
  if (!digits) return 'El número de teléfono es obligatorio';
  if (/\D/.test(phone) && digits.length > 0) {
    // Phone had non-digit chars but after cleaning it's valid - fine
  }
  if (digits.length < 7) return 'El número es demasiado corto (mínimo 7 dígitos)';
  return null;
}
