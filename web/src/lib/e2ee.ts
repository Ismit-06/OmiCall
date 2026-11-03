/**
 * Client-Side End-to-End Encryption (E2EE) Key Provider
 * 
 * Cryptographic Boundary Guarantees:
 * 1. Cryptographic keys are generated locally via Web Crypto API (SubtleCrypto).
 * 2. Raw keys NEVER leave client memory.
 * 3. The backend, database, logs, and LiveKit SFU never receive or touch the key.
 */

export async function generateCallKey(): Promise<string> {
  const randomBytes = new Uint8Array(32); // 256-bit key
  window.crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function deriveSharedKey(sharedSecret: string, salt: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return window.crypto.subtle.importKey(
    'raw',
    enc.encode(sharedSecret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  ).then(baseKey =>
    window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode(salt),
        iterations: 100000,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
  );
}
