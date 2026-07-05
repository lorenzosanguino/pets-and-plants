// Native browser-based Web Crypto AES-GCM 256-bit encryption (100% offline & secure)

// Retrieve salt or create one if it doesn't exist
function getOrCreateSalt(): ArrayBuffer {
  if (typeof window === 'undefined') return new ArrayBuffer(16);
  const existing = localStorage.getItem('petplant_crypto_salt');
  if (existing) {
    // Convert hex string back to ArrayBuffer
    const arr = new Uint8Array(existing.length / 2);
    for (let i = 0; i < arr.length; i++) {
      arr[i] = parseInt(existing.substring(i * 2, i * 2 + 2), 16);
    }
    return arr.buffer;
  }
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  localStorage.setItem('petplant_crypto_salt', hex);
  return salt.buffer;
}

// Derive a strong encryption key from a PIN code using PBKDF2
async function deriveKey(pin: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const rawKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    rawKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Convert ArrayBuffer to Hex string
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert Hex string to ArrayBuffer
function hexToBuffer(hex: string): ArrayBuffer {
  const view = new Uint8Array(hex.length / 2);
  for (let i = 0; i < view.length; i++) {
    view[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return view.buffer;
}

// Encrypt a clear text string using AES-GCM
export async function encryptText(clearText: string, pin: string): Promise<string> {
  if (!clearText) return '';
  const salt = getOrCreateSalt();
  const key = await deriveKey(pin, salt);
  
  // Create initialization vector (IV)
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    enc.encode(clearText)
  );

  const ivHex = bufferToHex(iv.buffer);
  const dataHex = bufferToHex(encryptedBuffer);

  // Return IV joined with encrypted hex data
  return `${ivHex}:${dataHex}`;
}

// Decrypt an AES-GCM encrypted string
export async function decryptText(encryptedTextHex: string, pin: string): Promise<string> {
  if (!encryptedTextHex) return '';
  
  const parts = encryptedTextHex.split(':');
  if (parts.length !== 2) {
    // Not encrypted or wrong format
    return encryptedTextHex;
  }
  
  try {
    const iv = hexToBuffer(parts[0]);
    const data = hexToBuffer(parts[1]);
    const salt = getOrCreateSalt();
    const key = await deriveKey(pin, salt);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      data
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    console.error('[Crypto] Decryption failed:', err);
    throw new Error('Incorrect Security PIN', { cause: err });
  }
}
