import { createCipheriv, randomBytes } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  decryptSensitiveJson,
  encryptSensitiveJson,
  hmacSha256,
  sha256,
  validateEncryptionKey,
  validateRateLimitHmacKey,
} from "../../src/lib/server/crypto/sensitive-data";
import type { EncryptedEnvelope } from "../../src/types/database";

const encryptionKey = randomBytes(32).toString("base64");
const rateLimitHmacKey = randomBytes(32).toString("base64");

describe("sensitive data crypto", () => {
  it("round-trips nested JSON through an AES-256-GCM envelope", () => {
    const payload = {
      message: "private text",
      nested: { list: ["one", "two"], enabled: true },
    };
    const envelope = encryptSensitiveJson(payload, encryptionKey);

    expect(envelope).toMatchObject({
      kid: "v1",
      algorithm: "aes-256-gcm",
    });
    expect(envelope.ciphertext).not.toContain(payload.message);
    expect(decryptSensitiveJson(envelope, encryptionKey)).toEqual(payload);
  });

  it("uses a fresh IV and ciphertext for each encryption", () => {
    const first = encryptSensitiveJson("private text", encryptionKey);
    const second = encryptSensitiveJson("private text", encryptionKey);

    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it.each([
    ["ciphertext", (envelope: EncryptedEnvelope) => tamperBase64(envelope, "ciphertext")],
    ["auth tag", (envelope: EncryptedEnvelope) => tamperBase64(envelope, "authTag")],
    ["IV", (envelope: EncryptedEnvelope) => tamperBase64(envelope, "iv")],
  ])("rejects a tampered %s with a generic error", (_, tamper) => {
    const envelope = encryptSensitiveJson("private text", encryptionKey);

    expect(() =>
      decryptSensitiveJson(tamper(envelope), encryptionKey),
    ).toThrow("Sensitive payload decryption failed.");
  });

  it("rejects decryption with the wrong key", () => {
    const envelope = encryptSensitiveJson("private text", encryptionKey);

    expect(() =>
      decryptSensitiveJson(envelope, randomBytes(32).toString("base64")),
    ).toThrow("Sensitive payload decryption failed.");
  });

  it.each([
    {},
    { kid: "v2", algorithm: "aes-256-gcm" },
    { kid: "v1", algorithm: "aes-128-gcm" },
    {
      kid: "v1",
      algorithm: "aes-256-gcm",
      iv: "***",
      authTag: "***",
      ciphertext: "***",
    },
    {
      ...encryptSensitiveJson("private text", encryptionKey),
      unexpected: "field",
    },
  ])("rejects malformed or unsupported envelopes", (envelope) => {
    expect(() => decryptSensitiveJson(envelope, encryptionKey)).toThrow(
      "Sensitive payload envelope is invalid.",
    );
  });

  it("rejects authenticated plaintext that is not valid JSON", () => {
    const envelope = encryptRawText("not-json", encryptionKey);

    expect(() => decryptSensitiveJson(envelope, encryptionKey)).toThrow(
      "Sensitive payload decryption failed.",
    );
  });

  it("rejects JSON-incompatible payloads safely", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    expect(() => encryptSensitiveJson(undefined, encryptionKey)).toThrow(
      "Sensitive payload is not JSON-compatible.",
    );
    expect(() => encryptSensitiveJson(cyclic, encryptionKey)).toThrow(
      "Sensitive payload is not JSON-compatible.",
    );
  });

  it("validates canonical 32-byte encryption and HMAC keys", () => {
    expect(validateEncryptionKey(encryptionKey)).toBe(encryptionKey);
    expect(validateRateLimitHmacKey(rateLimitHmacKey)).toBe(rateLimitHmacKey);
    expect(() => validateEncryptionKey("not-base64")).toThrow(
      "MIND_BRIDGE_DATA_ENCRYPTION_KEY_V1",
    );
    expect(() => hmacSha256("subject", "not-base64")).toThrow(
      "MIND_BRIDGE_RATE_LIMIT_HMAC_KEY",
    );
  });

  it("creates lowercase hex digests without logging", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      const envelope = encryptSensitiveJson("private text", encryptionKey);

      expect(decryptSensitiveJson(envelope, encryptionKey)).toBe("private text");
      expect(sha256("owner token")).toMatch(/^[0-9a-f]{64}$/);
      expect(hmacSha256("subject", rateLimitHmacKey)).toMatch(/^[0-9a-f]{64}$/);
      expect(log).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
      warn.mockRestore();
      error.mockRestore();
    }
  });
});

function tamperBase64(
  envelope: EncryptedEnvelope,
  field: "iv" | "authTag" | "ciphertext",
) {
  const bytes = Buffer.from(envelope[field], "base64");
  bytes[0] ^= 1;

  return {
    ...envelope,
    [field]: bytes.toString("base64"),
  };
}

function encryptRawText(plaintext: string, encodedKey: string): EncryptedEnvelope {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    Buffer.from(encodedKey, "base64"),
    iv,
  );
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return {
    kid: "v1",
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}
