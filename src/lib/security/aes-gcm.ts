import crypto from 'node:crypto';

/**
 * Resolves and validates a 32-byte (256-bit) encryption key Buffer.
 * Supports 64-character hexadecimal strings or 32-character raw byte strings.
 */
function resolveKeyBuffer(customKey?: string): Buffer {
  const rawKey = customKey ?? process.env.ENCRYPTION_KEY;

  if (!rawKey) {
    throw new Error('ENCRYPTION_KEY is required and missing from environment or parameters');
  }

  let keyBuffer: Buffer;
  if (rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
    keyBuffer = Buffer.from(rawKey, 'hex');
  } else if (Buffer.byteLength(rawKey, 'utf8') === 32) {
    keyBuffer = Buffer.from(rawKey, 'utf8');
  } else {
    throw new Error('Invalid key length: encryption key must be 32 bytes (256 bits) or 64 hex characters');
  }

  if (keyBuffer.length !== 32) {
    throw new Error('Invalid key length: key must be exactly 32 bytes (256 bits)');
  }

  return keyBuffer;
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Generates a fresh random 12-byte IV for every encryption.
 * Returns a colon-delimited string: `${ivHex}:${tagHex}:${cipherHex}`.
 */
export function encryptToken(token: string, customKey?: string): string {
  const key = resolveKeyBuffer(customKey);
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(token, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/**
 * Decrypts a colon-delimited `${ivHex}:${tagHex}:${cipherHex}` string using AES-256-GCM.
 * Validates format, IV, auth tag, and ciphertext integrity.
 * Throws authentication failure if ciphertext, IV, or auth tag was tampered with.
 */
export function decryptToken(encrypted: string, customKey?: string): string {
  if (typeof encrypted !== 'string' || !encrypted.includes(':')) {
    throw new Error('Malformed or invalid encrypted payload format. Expected iv:tag:ciphertext');
  }

  const parts = encrypted.split(':');
  if (parts.length < 3) {
    throw new Error('Malformed encrypted payload format. Expected iv:tag:ciphertext');
  }

  const [ivHex, tagHex, ...cipherHexParts] = parts;
  const cipherHex = cipherHexParts.join(':');

  if (ivHex.length === 0 || tagHex.length === 0) {
    throw new Error('Malformed encrypted payload string format: missing IV or auth tag');
  }

  if (!/^[0-9a-fA-F]*$/.test(ivHex) || !/^[0-9a-fA-F]*$/.test(tagHex) || !/^[0-9a-fA-F]*$/.test(cipherHex)) {
    throw new Error('Malformed encrypted string: parts must be valid hex');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const ciphertext = Buffer.from(cipherHex, 'hex');

  if (iv.length !== 12) {
    throw new Error('Invalid IV length: AES-GCM requires a 12-byte IV');
  }
  if (tag.length !== 16) {
    throw new Error('Invalid authentication tag length: AES-GCM requires a 16-byte auth tag');
  }

  const key = resolveKeyBuffer(customKey);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  // intentional any: catch decryption error
  } catch (err: any) {
    throw new Error(`Authentication/integrity check failed during decryption: ${err.message}`);
  }
}
