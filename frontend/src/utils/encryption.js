/**
 * Encryption Utility using Web Crypto API
 * Provides asymmetric encryption (seal) for secure IPFS uploads
 */

/**
 * Generate a key pair for encryption/decryption
 * @returns {Promise<Object>} - { publicKey, privateKey }
 */
export async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['encrypt', 'decrypt']
  );
  
  return keyPair;
}

/**
 * Export public key to JWK format
 * @param {CryptoKey} publicKey - Public key
 * @returns {Promise<Object>} - JWK formatted key
 */
export async function exportPublicKey(publicKey) {
  return await window.crypto.subtle.exportKey('jwk', publicKey);
}

/**
 * Export private key to JWK format
 * @param {CryptoKey} privateKey - Private key
 * @returns {Promise<Object>} - JWK formatted key
 */
export async function exportPrivateKey(privateKey) {
  return await window.crypto.subtle.exportKey('jwk', privateKey);
}

/**
 * Import public key from JWK format
 * @param {Object} jwk - JWK formatted key
 * @returns {Promise<CryptoKey>} - Public key
 */
export async function importPublicKey(jwk) {
  return await window.crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    true,
    ['encrypt']
  );
}

/**
 * Import private key from JWK format
 * @param {Object} jwk - JWK formatted key
 * @returns {Promise<CryptoKey>} - Private key
 */
export async function importPrivateKey(jwk) {
  return await window.crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    true,
    ['decrypt']
  );
}

/**
 * Encrypt data using public key (seal)
 * @param {string} data - Data to encrypt
 * @param {CryptoKey} publicKey - Public key for encryption
 * @returns {Promise<string>} - Base64 encoded encrypted data
 */
export async function sealData(data, publicKey) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP'
    },
    publicKey,
    dataBuffer
  );
  
  // Convert to base64
  const encryptedArray = Array.from(new Uint8Array(encryptedBuffer));
  const base64 = btoa(String.fromCharCode.apply(null, encryptedArray));
  
  return base64;
}

/**
 * Decrypt data using private key (unseal)
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @param {CryptoKey} privateKey - Private key for decryption
 * @returns {Promise<string>} - Decrypted data
 */
export async function unsealData(encryptedData, privateKey) {
  // Convert from base64
  const encryptedString = atob(encryptedData);
  const encryptedArray = new Uint8Array(encryptedString.length);
  for (let i = 0; i < encryptedString.length; i++) {
    encryptedArray[i] = encryptedString.charCodeAt(i);
  }
  
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'RSA-OAEP'
    },
    privateKey,
    encryptedArray
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Generate or retrieve user's encryption keys from localStorage
 * @param {string} walletAddress - User's wallet address (used as key identifier)
 * @returns {Promise<Object>} - { publicKey, privateKey, publicKeyJWK, privateKeyJWK }
 */
export async function getUserKeys(walletAddress) {
  const storageKey = `encryption_keys_${walletAddress}`;
  const stored = localStorage.getItem(storageKey);
  
  if (stored) {
    // Import existing keys
    const keys = JSON.parse(stored);
    const publicKey = await importPublicKey(keys.publicKeyJWK);
    const privateKey = await importPrivateKey(keys.privateKeyJWK);
    
    return {
      publicKey,
      privateKey,
      publicKeyJWK: keys.publicKeyJWK,
      privateKeyJWK: keys.privateKeyJWK
    };
  } else {
    // Generate new keys
    const keyPair = await generateKeyPair();
    const publicKeyJWK = await exportPublicKey(keyPair.publicKey);
    const privateKeyJWK = await exportPrivateKey(keyPair.privateKey);
    
    // Store keys
    localStorage.setItem(storageKey, JSON.stringify({
      publicKeyJWK,
      privateKeyJWK
    }));
    
    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      publicKeyJWK,
      privateKeyJWK
    };
  }
}

/**
 * Encrypt contribution data before IPFS upload
 * @param {Object} data - Contribution data
 * @param {string} walletAddress - User's wallet address
 * @returns {Promise<Object>} - { encryptedData, publicKeyJWK }
 */
export async function encryptContribution(data, walletAddress) {
  const keys = await getUserKeys(walletAddress);
  const dataString = JSON.stringify(data);
  const encryptedData = await sealData(dataString, keys.publicKey);
  
  return {
    encryptedData,
    publicKeyJWK: keys.publicKeyJWK
  };
}

/**
 * Decrypt contribution data from IPFS
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @param {string} walletAddress - User's wallet address
 * @returns {Promise<Object>} - Decrypted contribution data
 */
export async function decryptContribution(encryptedData, walletAddress) {
  const keys = await getUserKeys(walletAddress);
  const decryptedString = await unsealData(encryptedData, keys.privateKey);
  return JSON.parse(decryptedString);
}

export default {
  generateKeyPair,
  exportPublicKey,
  exportPrivateKey,
  importPublicKey,
  importPrivateKey,
  sealData,
  unsealData,
  getUserKeys,
  encryptContribution,
  decryptContribution
};
