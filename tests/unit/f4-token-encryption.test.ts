import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';

describe('F4: OAuth Token & Secret Encryption with AES-256-GCM (AC-F4-06)', () => {
  // 32-byte hexadecimal key for AES-256
  const TEST_VALID_KEY_HEX = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const TEST_VALID_KEY_32_RAW = '12345678901234567890123456789012'; // exactly 32 chars
  const SAMPLE_ACCESS_TOKEN = 'AQV_LinkedIn_OAuth_Access_Token_super_secret_payload_xyz123';

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.ENCRYPTION_KEY = TEST_VALID_KEY_HEX;
  });

  describe('AC-F4-06: Encryption & Decryption Round-Trip', () => {
    it('AC-F4-06: encrypts plaintext token and successfully decrypts back to original', async () => {
      const { encryptToken, decryptToken } = await import('@/lib/security/encryption');

      const encrypted = encryptToken(SAMPLE_ACCESS_TOKEN);
      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);
      expect(encrypted).not.toBe(SAMPLE_ACCESS_TOKEN);

      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(SAMPLE_ACCESS_TOKEN);
    });

    it('AC-F4-06: supports custom key parameter override', async () => {
      const { encryptToken, decryptToken } = await import('@/lib/security/encryption');

      const customKey = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
      const encrypted = encryptToken(SAMPLE_ACCESS_TOKEN, customKey);
      const decrypted = decryptToken(encrypted, customKey);

      expect(decrypted).toBe(SAMPLE_ACCESS_TOKEN);

      // Decrypting with wrong key must fail authentication
      expect(() => {
        decryptToken(encrypted, TEST_VALID_KEY_HEX);
      }).toThrow(/auth|fail|tag|integrity/i);
    });

    it('AC-F4-06: handles unicode characters and long JWT payloads correctly', async () => {
      const { encryptToken, decryptToken } = await import('@/lib/security/encryption');

      const complexPayload = JSON.stringify({
        sub: 'member:urn:li:person:12345',
        name: 'Élodie Münch 🚀 品牌导航',
        roles: ['admin', 'publisher'],
        jwt_blob: 'a'.repeat(4096),
      });

      const encrypted = encryptToken(complexPayload);
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(complexPayload);
    });

    it('AC-F4-06: handles empty string token encryption and decryption', async () => {
      const { encryptToken, decryptToken } = await import('@/lib/security/encryption');

      const emptyToken = '';
      const encrypted = encryptToken(emptyToken);
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(emptyToken);
    });
  });

  describe('AC-F4-06: Cryptographic Freshness (Random IV & Salt)', () => {
    it('AC-F4-06: encrypting same plaintext twice produces different ciphertexts due to random IV', async () => {
      const { encryptToken } = await import('@/lib/security/encryption');

      const enc1 = encryptToken(SAMPLE_ACCESS_TOKEN);
      const enc2 = encryptToken(SAMPLE_ACCESS_TOKEN);

      expect(enc1).not.toBe(enc2);
    });

    it('AC-F4-06: encrypted representation contains IV, auth tag, and ciphertext parts', async () => {
      const { encryptToken } = await import('@/lib/security/encryption');

      const encrypted = encryptToken(SAMPLE_ACCESS_TOKEN);
      // Format is iv:tag:ciphertext or contains distinct colon-delimited components
      const parts = encrypted.split(':');
      expect(parts.length).toBeGreaterThanOrEqual(3);

      const [ivHex, tagHex, cipherHex] = parts;
      expect(ivHex.length).toBeGreaterThan(0);
      expect(tagHex.length).toBeGreaterThan(0);
      expect(cipherHex.length).toBeGreaterThan(0);
    });

    it('AC-F4-06: ciphertext does not contain any plaintext token substring (leak prevention)', async () => {
      const { encryptToken } = await import('@/lib/security/encryption');

      const encrypted = encryptToken(SAMPLE_ACCESS_TOKEN);
      expect(encrypted).not.toContain(SAMPLE_ACCESS_TOKEN);
      expect(encrypted).not.toContain('LinkedIn');
      expect(encrypted).not.toContain('super_secret');
    });
  });

  describe('AC-F4-06: Tamper Detection & Integrity Verification', () => {
    it('AC-F4-06: tampering with ciphertext throws authentication/integrity error', async () => {
      const { encryptToken, decryptToken } = await import('@/lib/security/encryption');

      const encrypted = encryptToken(SAMPLE_ACCESS_TOKEN);
      const parts = encrypted.split(':');
      // Mutate the ciphertext portion
      const mutatedCipher = parts[2].slice(0, -2) + (parts[2].endsWith('a') ? 'b' : 'a');
      const tampered = `${parts[0]}:${parts[1]}:${mutatedCipher}`;

      expect(() => {
        decryptToken(tampered);
      }).toThrow(/auth|fail|tag|tamper|integrity/i);
    });

    it('AC-F4-06: tampering with authentication tag throws error', async () => {
      const { encryptToken, decryptToken } = await import('@/lib/security/encryption');

      const encrypted = encryptToken(SAMPLE_ACCESS_TOKEN);
      const parts = encrypted.split(':');
      // Mutate tag portion
      const mutatedTag = '00' + parts[1].slice(2);
      const tampered = `${parts[0]}:${mutatedTag}:${parts[2]}`;

      expect(() => {
        decryptToken(tampered);
      }).toThrow(/auth|fail|tag|tamper|integrity/i);
    });

    it('AC-F4-06: tampering with IV throws error', async () => {
      const { encryptToken, decryptToken } = await import('@/lib/security/encryption');

      const encrypted = encryptToken(SAMPLE_ACCESS_TOKEN);
      const parts = encrypted.split(':');
      // Mutate IV portion
      const mutatedIv = 'ff' + parts[0].slice(2);
      const tampered = `${mutatedIv}:${parts[1]}:${parts[2]}`;

      expect(() => {
        decryptToken(tampered);
      }).toThrow(/auth|fail|tag|tamper|integrity/i);
    });

    it('AC-F4-06: malformed encrypted payload string format throws descriptive error', async () => {
      const { decryptToken } = await import('@/lib/security/encryption');

      expect(() => {
        decryptToken('not-a-valid-encrypted-string');
      }).toThrow(/malformed|invalid|format/i);

      expect(() => {
        decryptToken('ivonly:tagonly');
      }).toThrow(/malformed|invalid|format/i);
    });
  });

  describe('AC-F4-06: Key Validation & Missing Environment Variable Guard', () => {
    it('AC-F4-06: throws descriptive error when ENCRYPTION_KEY is unset and no key passed', async () => {
      delete process.env.ENCRYPTION_KEY;
      const { encryptToken } = await import('@/lib/security/encryption');

      expect(() => {
        encryptToken(SAMPLE_ACCESS_TOKEN);
      }).toThrow(/ENCRYPTION_KEY|missing|required/i);
    });

    it('AC-F4-06: throws descriptive error when key length is invalid (not 32 bytes)', async () => {
      process.env.ENCRYPTION_KEY = 'short_key';
      const { encryptToken } = await import('@/lib/security/encryption');

      expect(() => {
        encryptToken(SAMPLE_ACCESS_TOKEN);
      }).toThrow(/32 bytes|256 bits|invalid key/i);
    });
  });
});
