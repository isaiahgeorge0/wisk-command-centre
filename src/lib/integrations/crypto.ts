import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const encoded = process.env.INTEGRATIONS_ENCRYPTION_KEY?.trim();

  if (!encoded) {
    throw new Error(
      "INTEGRATIONS_ENCRYPTION_KEY is not configured. Add a 32-byte base64 key to .env.local."
    );
  }

  const key = Buffer.from(encoded, "base64");

  if (key.length !== 32) {
    throw new Error(
      "INTEGRATIONS_ENCRYPTION_KEY must decode to exactly 32 bytes (256 bits)."
    );
  }

  return key;
}

/**
 * Encrypts integration tokens before storing them in the database.
 * The INTEGRATIONS_ENCRYPTION_KEY is a master secret — if it is lost or
 * changed without re-connecting integrations, existing tokens cannot be
 * decrypted and users must connect their providers again.
 */
export function encryptIntegrationToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

/**
 * Decrypts a token stored by encryptIntegrationToken.
 * Throws if the master key is wrong or the ciphertext was tampered with.
 */
export function decryptIntegrationToken(payload: string): string {
  const key = getEncryptionKey();
  const [ivB64, authTagB64, dataB64] = payload.split(".");

  if (!ivB64 || !authTagB64 || !dataB64) {
    throw new Error("Invalid encrypted token payload.");
  }

  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encrypted = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
