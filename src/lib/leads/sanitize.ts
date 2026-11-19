// Input normalisation shared by the client and the server. Output is plain text: HTML escaping
// still happens wherever the text is rendered (emails escape every value).

// Bidirectional overrides/isolates can make text display differently from how it reads.
const BIDI = /[\u202A-\u202E\u2066-\u2069]/gu;

/** Single-line text: NFC, no control characters, collapsed whitespace, trimmed. */
export function cleanLine(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[\p{Cc}\u2028\u2029]/gu, " ")
    .replace(BIDI, "")
    .replace(/\s+/gu, " ")
    .trim();
}

/** Multi-line text: like cleanLine but keeps single line breaks (max two in a row). */
export function cleanMultiline(value: string): string {
  return value
    .normalize("NFC")
    .replace(/\r\n?/gu, "\n")
    .replace(/\p{Cc}/gu, (char) => (char === "\n" ? char : char === "\t" ? " " : ""))
    .replace(BIDI, "")
    .replace(/[^\S\n]+/gu, " ")
    .replace(/ ?\n ?/gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}
