export type EncryptedEnvelope = {
  kid: "v1";
  algorithm: "aes-256-gcm";
  iv: string;
  authTag: string;
  ciphertext: string;
};
