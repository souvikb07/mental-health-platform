export function normalizeRiskInput(input: string) {
  return input
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, "\"")
    .replace(/\bi'm\b/g, "i am")
    .replace(/\bim\b/g, "i am")
    .replace(/\bdon't\b/g, "do not")
    .replace(/\bcan't\b/g, "cannot")
    .replace(/\bcant\b/g, "cannot")
    .replace(/\bkms\b/g, "kill myself")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
