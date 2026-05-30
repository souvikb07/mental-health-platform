import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  getDataEnvironment,
  resolveDataMode,
} from "../../src/lib/server/config/data-env";

const encryptionKey = randomBytes(32).toString("base64");
const rateLimitHmacKey = randomBytes(32).toString("base64");

describe("data environment", () => {
  it("defaults non-production environments to transient mode", () => {
    expect(getDataEnvironment({ NODE_ENV: "test" })).toEqual({
      mode: "transient",
    });
  });

  it("allows explicit local transient mode without Supabase configuration", () => {
    expect(
      getDataEnvironment({
        NODE_ENV: "development",
        MIND_BRIDGE_DATA_MODE: "transient",
      }),
    ).toEqual({ mode: "transient" });
  });

  it("fails closed when production configuration is missing", () => {
    expect(() => getDataEnvironment({ NODE_ENV: "production" })).toThrow(
      "SUPABASE_URL",
    );
  });

  it("fails closed when production explicitly requests transient mode", () => {
    expect(() =>
      resolveDataMode({
        NODE_ENV: "production",
        MIND_BRIDGE_DATA_MODE: "transient",
      }),
    ).toThrow("Production requires MIND_BRIDGE_DATA_MODE=supabase");
  });

  it("rejects unknown data modes", () => {
    expect(() =>
      resolveDataMode({
        NODE_ENV: "test",
        MIND_BRIDGE_DATA_MODE: "mystery",
      }),
    ).toThrow("MIND_BRIDGE_DATA_MODE must be transient or supabase");
  });

  it("prefers the modern Supabase secret key", () => {
    expect(
      getDataEnvironment({
        ...validSupabaseEnvironment(),
        SUPABASE_SECRET_KEY: "modern-secret",
        SUPABASE_SERVICE_ROLE_KEY: "legacy-secret",
      }),
    ).toMatchObject({
      mode: "supabase",
      supabaseServerKey: "modern-secret",
    });
  });

  it("accepts the legacy Supabase service-role key as a fallback", () => {
    const env = validSupabaseEnvironment();
    delete env.SUPABASE_SECRET_KEY;
    env.SUPABASE_SERVICE_ROLE_KEY = "legacy-secret";

    expect(getDataEnvironment(env)).toMatchObject({
      mode: "supabase",
      supabaseServerKey: "legacy-secret",
    });
  });

  it.each([
    ["SUPABASE_URL", "SUPABASE_URL"],
    ["SUPABASE_SECRET_KEY", "SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY"],
    ["MIND_BRIDGE_DATA_ENCRYPTION_KEY_V1", "MIND_BRIDGE_DATA_ENCRYPTION_KEY_V1"],
    ["MIND_BRIDGE_RATE_LIMIT_HMAC_KEY", "MIND_BRIDGE_RATE_LIMIT_HMAC_KEY"],
  ])("requires %s in Supabase mode", (key, expectedMessage) => {
    const env = validSupabaseEnvironment();
    delete env[key];

    expect(() => getDataEnvironment(env)).toThrow(expectedMessage);
  });

  it.each([
    "not-a-url",
    "ftp://example.supabase.co",
    "https://user:password@example.supabase.co",
  ])("rejects invalid Supabase URLs without echoing them", (supabaseUrl) => {
    expect(() =>
      getDataEnvironment({
        ...validSupabaseEnvironment(),
        SUPABASE_URL: supabaseUrl,
      }),
    ).toThrow("SUPABASE_URL must be a valid HTTP(S) URL");

    expect(getErrorMessage(() =>
      getDataEnvironment({
        ...validSupabaseEnvironment(),
        SUPABASE_URL: supabaseUrl,
      }),
    )).not.toContain(supabaseUrl);
  });

  it.each([
    ["MIND_BRIDGE_DATA_ENCRYPTION_KEY_V1", "not-base64"],
    ["MIND_BRIDGE_DATA_ENCRYPTION_KEY_V1", encryptionKey.replace(/=$/, "")],
    ["MIND_BRIDGE_DATA_ENCRYPTION_KEY_V1", randomBytes(31).toString("base64")],
    ["MIND_BRIDGE_RATE_LIMIT_HMAC_KEY", "not-base64"],
    ["MIND_BRIDGE_RATE_LIMIT_HMAC_KEY", rateLimitHmacKey.replace(/=$/, "")],
    ["MIND_BRIDGE_RATE_LIMIT_HMAC_KEY", randomBytes(33).toString("base64")],
  ])("eagerly rejects invalid %s values", (key, value) => {
    expect(() =>
      getDataEnvironment({
        ...validSupabaseEnvironment(),
        [key]: value,
      }),
    ).toThrow(`${key} must be a canonical base64-encoded 32-byte key`);
  });

  it("does not include supplied secret values in validation errors", () => {
    const invalidSecret = "private-value-that-must-not-appear";
    const message = getErrorMessage(() =>
      getDataEnvironment({
        ...validSupabaseEnvironment(),
        MIND_BRIDGE_RATE_LIMIT_HMAC_KEY: invalidSecret,
      }),
    );

    expect(message).toContain("MIND_BRIDGE_RATE_LIMIT_HMAC_KEY");
    expect(message).not.toContain(invalidSecret);
  });
});

function validSupabaseEnvironment(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    MIND_BRIDGE_DATA_MODE: "supabase",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SECRET_KEY: "modern-secret",
    MIND_BRIDGE_DATA_ENCRYPTION_KEY_V1: encryptionKey,
    MIND_BRIDGE_RATE_LIMIT_HMAC_KEY: rateLimitHmacKey,
  };
}

function getErrorMessage(callback: () => unknown) {
  try {
    callback();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }

  throw new Error("Expected callback to throw.");
}
