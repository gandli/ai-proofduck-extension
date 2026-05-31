/**
 * Advanced encryption utility for API keys using Web Crypto API.
 * Uses a unique, securely generated key. In a production extension,
 * you should use chrome.storage.session or OS-level keystore (e.g., via Native Messaging),
 * but for this security boundary implementation, we use a randomly generated
 * session-level key that isn't persisted to disk, avoiding local storage theater.
 */

// We generate a key strictly in memory when the module loads.
// If the extension background process restarts, the user will need to re-enter
// keys, or we accept that local API keys in a simple extension aren't truly
// secure against local filesystem reads without a user password.
// For the scope of this fix, we avoid hardcoding the key and avoid
// storing the key right next to the data in local storage.

let sessionKeyMaterial: string | null = null;
let sessionSalt: string | null = null;

function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function getSessionKeyMaterial() {
  if (!sessionKeyMaterial || !sessionSalt) {
    sessionKeyMaterial = generateRandomString(32);
    sessionSalt = generateRandomString(16);
  }
  return { keyMaterial: sessionKeyMaterial, salt: sessionSalt };
}

async function getCryptoKey() {
  const { keyMaterial: rawKeyMaterial, salt: rawSalt } = getSessionKeyMaterial();
  const enc = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(rawKeyMaterial),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(rawSalt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(data: string): Promise<string> {
  if (!data) return data;
  try {
    const key = await getCryptoKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(data)
    );
    const encryptedArray = Array.from(new Uint8Array(encrypted));
    const ivArray = Array.from(iv);
    return btoa(JSON.stringify({ i: ivArray, d: encryptedArray }));
  } catch (e) {
    console.error('Encryption failed:', e);
    throw new Error('Encryption failed securely');
  }
}

export async function decryptData(data: string): Promise<string> {
  if (!data) return data;
  try {
    const parsed = JSON.parse(atob(data));
    if (!parsed.i || !parsed.d) return data;

    const key = await getCryptoKey();
    const iv = new Uint8Array(parsed.i);
    const encrypted = new Uint8Array(parsed.d);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (e) {
    return data;
  }
}
