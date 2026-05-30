import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";

import type { EncryptedEnvelope } from "@/types/database";

const ALGORITHM = "aes-256-gcm";
const KEY_ID = "v1";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const KEY_BYTES = 32;
const ENCRYPTED_ENVELOPE_KEYS = [
  "kid",
  "algorithm",
  "iv",
  "authTag",
  "ciphertext",
] as const;
const CANONICAL_BASE64_PATTERN =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export function encryptSensitiveJson(
  value: unknown,
  encodedKey = process.env.MIND_BRIDGE_DATA_ENCRYPTION_KEY_V1,
): EncryptedEnvelope {
  const plaintext = serializeSensitiveJson(value);
  const key = decodeValidatedKey(
    validateEncryptionKey(encodedKey),
    "MIND_BRIDGE_DATA_ENCRYPTION_KEY_V1",
  );
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return {
    kid: KEY_ID,
    algorithm: ALGORITHM,
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptSensitiveJson<T>(
  envelope: unknown,
  encodedKey = process.env.MIND_BRIDGE_DATA_ENCRYPTION_KEY_V1,
): T {
  const validatedEnvelope = validateEncryptedEnvelope(envelope);
  const key = decodeValidatedKey(
    validateEncryptionKey(encodedKey),
    "MIND_BRIDGE_DATA_ENCRYPTION_KEY_V1",
  );

  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(validatedEnvelope.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(validatedEnvelope.authTag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(validatedEnvelope.ciphertext, "base64")),
      decipher.final(),
    ]);

    return JSON.parse(plaintext.toString("utf8")) as T;
  } catch {
    throw new Error("Sensitive payload decryption failed.");
  }
}

export function validateEncryptionKey(encodedKey: string | undefined) {
  return validateBase64Key(
    encodedKey,
    "MIND_BRIDGE_DATA_ENCRYPTION_KEY_V1",
  );
}

export function validateRateLimitHmacKey(encodedKey: string | undefined) {
  return validateBase64Key(encodedKey, "MIND_BRIDGE_RATE_LIMIT_HMAC_KEY");
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function hmacSha256(
  value: string,
  encodedKey = process.env.MIND_BRIDGE_RATE_LIMIT_HMAC_KEY,
) {
  const key = decodeValidatedKey(
    validateRateLimitHmacKey(encodedKey),
    "MIND_BRIDGE_RATE_LIMIT_HMAC_KEY",
  );

  return createHmac("sha256", key).update(value).digest("hex");
}

function serializeSensitiveJson(value: unknown) {
  try {
    const serialized = JSON.stringify(value);

    if (serialized === undefined) {
      throw new Error("Sensitive payload is not JSON-compatible.");
    }

    return serialized;
  } catch {
    throw new Error("Sensitive payload is not JSON-compatible.");
  }
}

function validateEncryptedEnvelope(envelope: unknown): EncryptedEnvelope {
  if (!isRecord(envelope)) {
    throw new Error("Sensitive payload envelope is invalid.");
  }

  if (
    Object.keys(envelope).length !== ENCRYPTED_ENVELOPE_KEYS.length ||
    !ENCRYPTED_ENVELOPE_KEYS.every((key) =>
      Object.prototype.hasOwnProperty.call(envelope, key),
    ) ||
    envelope.kid !== KEY_ID ||
    envelope.algorithm !== ALGORITHM ||
    !isCanonicalBase64(envelope.iv) ||
    !isCanonicalBase64(envelope.authTag) ||
    !isCanonicalBase64(envelope.ciphertext)
  ) {
    throw new Error("Sensitive payload envelope is invalid.");
  }

  const iv = Buffer.from(envelope.iv, "base64");
  const authTag = Buffer.from(envelope.authTag, "base64");
  const ciphertext = Buffer.from(envelope.ciphertext, "base64");

  if (
    iv.length !== IV_BYTES ||
    authTag.length !== AUTH_TAG_BYTES ||
    ciphertext.length === 0
  ) {
    throw new Error("Sensitive payload envelope is invalid.");
  }

  return {
    kid: KEY_ID,
    algorithm: ALGORITHM,
    iv: envelope.iv,
    authTag: envelope.authTag,
    ciphertext: envelope.ciphertext,
  };
}

function validateBase64Key(encodedKey: string | undefined, name: string) {
  const normalized = encodedKey?.trim();

  if (!normalized) {
    throw new Error(`${name} is required.`);
  }

  if (!isCanonicalBase64(normalized)) {
    throw new Error(`${name} must be a canonical base64-encoded 32-byte key.`);
  }

  return decodeValidatedKey(normalized, name).toString("base64");
}

function decodeValidatedKey(encodedKey: string, name: string) {
  const key = Buffer.from(encodedKey, "base64");

  if (key.length !== KEY_BYTES || key.toString("base64") !== encodedKey) {
    throw new Error(`${name} must be a canonical base64-encoded 32-byte key.`);
  }

  return key;
}

function isCanonicalBase64(value: unknown): value is string {
  if (typeof value !== "string" || !CANONICAL_BASE64_PATTERN.test(value)) {
    return false;
  }

  return Buffer.from(value, "base64").toString("base64") === value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
