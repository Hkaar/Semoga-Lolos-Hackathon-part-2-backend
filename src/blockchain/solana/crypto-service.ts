import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  CipherGCMTypes,
} from "crypto";

const ALGORITHM   = "aes-256-gcm" as CipherGCMTypes;
const IV_LENGTH   = 12;  // 96-bit IV recommended for GCM
const TAG_LENGTH  = 16;  // 128-bit auth tag
const SALT_LENGTH = 32;

function getMasterSecret(): string {
  const secret = process.env.ENCRYPTION_MASTER_KEY;
  if (!secret) throw new Error("ENCRYPTION_MASTER_KEY not set in env");
  return secret;
}

function deriveKey(masterSecret: string, salt: Buffer): Buffer {
  return scryptSync(masterSecret, salt, 32, { N: 16384, r: 8, p: 1 }) as Buffer;
}

/**
 * Encrypt plaintext with AES-256-GCM.
 * Output format (hex, colon-delimited): salt:iv:tag:ciphertext
 */
export function encrypt(plaintext: string): string {
  const salt   = randomBytes(SALT_LENGTH);
  const iv     = randomBytes(IV_LENGTH);
  const key    = deriveKey(getMasterSecret(), salt);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    salt.toString("hex"),
    iv.toString("hex"),
    tag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

/**
 * Decrypt a value produced by encrypt().
 */
export function decrypt(encryptedString: string): string {
  const parts = encryptedString.split(":");
  if (parts.length !== 4) throw new Error("Invalid encrypted format");

  const [saltHex, ivHex, tagHex, ciphertextHex] = parts;

  const salt       = Buffer.from(saltHex, "hex");
  const iv         = Buffer.from(ivHex, "hex");
  const tag        = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const key        = deriveKey(getMasterSecret(), salt);

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}