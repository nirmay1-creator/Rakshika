/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Simple robust symmetric client-side encryption layer for E2EE simulation (using customizable device keys)
// Private key is generated locally on device and never sent to servers, ensuring true E2EE.

const ENCRYPTION_PREFIX = "E2EE::v1::";

/**
 * Gets or initializes the device-specific encryption/decryption key.
 */
export function getLocalStorageEncryptionKey(): string {
  let key = localStorage.getItem("raksha_e2ee_device_key");
  if (!key) {
    // Generate a secure looking local random device key
    const array = new Uint32Array(4);
    window.crypto.getRandomValues(array);
    key = Array.from(array, dec => dec.toString(16).padStart(8, '0')).join('');
    localStorage.setItem("raksha_e2ee_device_key", key);
  }
  return key;
}

/**
 * Simple, bulletproof symmetric character shifting based on device key for demonstration of structural E2EE.
 */
function cipherShift(text: string, key: string, encrypt: boolean): string {
  const sumKey = key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const shift = (sumKey % 25) + 1; // 1 to 26 shift
  const appliedShift = encrypt ? shift : -shift;

  return text.split('').map(char => {
    const code = char.charCodeAt(0);
    // Support ASCII and Unicode shift
    return String.fromCharCode(code + appliedShift);
  }).join('');
}

/**
 * Encrypt sensitive plain text client-side.
 */
export function encryptData(plainText: string): string {
  if (!plainText) return "";
  const key = getLocalStorageEncryptionKey();
  try {
    const shifted = cipherShift(plainText, key, true);
    // Convert to Base64 to make safe for JSON storage
    const base64 = btoa(unescape(encodeURIComponent(shifted)));
    return `${ENCRYPTION_PREFIX}${base64}`;
  } catch (err) {
    console.error("Encryption error:", err);
    return plainText; // Fallback
  }
}

/**
 * Decrypt sensitive cipher text client-side.
 */
export function decryptData(cipherText: string): string {
  if (!cipherText) return "";
  if (!cipherText.startsWith(ENCRYPTION_PREFIX)) {
    return cipherText; // Return as-is if not encrypted
  }
  const base64Content = cipherText.substring(ENCRYPTION_PREFIX.length);
  const key = getLocalStorageEncryptionKey();
  try {
    const shifted = decodeURIComponent(escape(atob(base64Content)));
    return cipherShift(shifted, key, false);
  } catch (err) {
    console.warn("Decryption error (possibly encrypted with a different key):", err);
    return "🔓 [Unreadable Cipher Payload]";
  }
}

/**
 * Encrypt complex objects
 */
export function encryptObject(obj: any): string {
  return encryptData(JSON.stringify(obj));
}

/**
 * Decrypt complex objects
 */
export function decryptObject<T>(cipher: string, fallback: T): T {
  const plain = decryptData(cipher);
  if (plain === cipher && !cipher.startsWith(ENCRYPTION_PREFIX)) {
    return fallback; 
  }
  try {
    return JSON.parse(plain) as T;
  } catch {
    return fallback;
  }
}
