/**
 * wa.me link with a prefilled message. Only the reference code goes into the message: no email,
 * phone number or other personal details. Returns null when no number is configured, so callers
 * can hide the action.
 */
export function buildWhatsAppUrl(number: string | undefined, message: string): string | null {
  const digits = (number ?? "").replace(/\D/g, "");
  if (digits.length < 6) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
