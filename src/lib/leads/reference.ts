import { randomInt } from "node:crypto";

// No 0/O/1/I/L/U: easy to read out loud and to type from an email or WhatsApp message.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Public, non-guessable inquiry reference such as "EZ-7K3M-Q9XD" (about 39 bits of randomness). */
export function generateReferenceCode(): string {
  const pick = () => ALPHABET[randomInt(ALPHABET.length)];
  const block = () => Array.from({ length: 4 }, pick).join("");
  return `EZ-${block()}-${block()}`;
}

export const REFERENCE_PATTERN = /^EZ-[2-9A-HJKMNP-TV-Z]{4}-[2-9A-HJKMNP-TV-Z]{4}$/;
