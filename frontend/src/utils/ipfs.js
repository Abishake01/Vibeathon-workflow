/**
 * IPFS Upload Utility with Hash Encryption
 * 
 * This utility provides functions to upload data to IPFS using Pinata.
 * Only the IPFS hash is encrypted for security.
 * 
 * Setup: Add your Pinata JWT token to .env file:
 * VITE_PINATA_JWT=your_jwt_token_here
 */

import { sealData, unsealData, getUserKeys } from './encryption.js';

/**
 * Upload to IPFS using Pinata (data is stored as-is, only hash is encrypted later)
 * @param {Object} data - Data to upload
 * @param {string} projectName - Optional project name for metadata
 * @returns {Promise<string>} - IPFS hash
 */
export async function uploadToPinata(data, projectName = 'Contribution') {
  // Get Pinata JWT from environment variable
  const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

  if (!PINATA_JWT) {
    throw new Error('Pinata JWT not configured. Please add VITE_PINATA_JWT to your .env file.');
  }

  try {
    // Convert data to JSON blob (no encryption of data)
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });

    // Create form data
    const formData = new FormData();
    formData.append('file', blob, `contribution-${Date.now()}.json`);

    // Add metadata
    const metadata = JSON.stringify({
      name: projectName || `Contribution-${data.uniqueId}`,
      keyvalues: {
        type: data.type,
        wallet: data.walletAddress,
        timestamp: data.timestamp,
        projectName: projectName
      }
    });
    formData.append('pinataMetadata', metadata);

    // Upload to Pinata using JWT
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed with status ${response.status}`);
    }

    const result = await response.json();
    return result.IpfsHash;
  } catch (error) {
    console.error('Pinata upload error:', error);
    throw error;
  }
}

/**
 * Upload to IPFS (uploads data and returns encrypted hash)
 * @param {Object} data - Data to upload
 * @param {string} projectName - Optional project name for metadata
 * @returns {Promise<Object>} - Upload result with encrypted hash
 */
export async function uploadToIPFS(data, projectName = 'Contribution') {
  try {
    // Upload to Pinata (data is stored as-is)
    const hash = await uploadToPinata(data, projectName);
    
    // Encrypt the IPFS hash
    const keys = await getUserKeys(data.walletAddress);
    const encryptedHash = await sealData(hash, keys.publicKey);
    
    return {
      success: true,
      hash: hash, // Original hash (for immediate use)
      encryptedHash: encryptedHash, // Encrypted hash (for secure storage)
      gateway: `https://gateway.pinata.cloud/ipfs/${hash}`,
      provider: 'pinata'
    };
  } catch (pinataError) {
    console.error('Pinata upload failed:', pinataError);
    
    // Return error (no fallback)
    return {
      success: false,
      error: pinataError.message || 'Failed to upload to IPFS',
      localOnly: true,
      message: 'IPFS upload failed. Please check your internet connection and try again.'
    };
  }
}

/**
 * Retrieve data from IPFS using Pinata gateway
 * @param {string} hash - IPFS hash (can be encrypted or plain)
 * @param {string} walletAddress - Optional wallet address for decrypting hash
 * @returns {Promise<Object>} - Retrieved data
 */
export async function retrieveFromIPFS(hash, walletAddress = null) {
  try {
    let actualHash = hash;
    
    // If hash looks encrypted (base64) and wallet address provided, decrypt it
    if (walletAddress && hash.length > 100) {
      try {
        const keys = await getUserKeys(walletAddress);
        actualHash = await unsealData(hash, keys.privateKey);
      } catch (decryptError) {
        // If decryption fails, assume it's a plain hash
        console.warn('Could not decrypt hash, using as-is:', decryptError);
      }
    }
    
    const url = `https://gateway.pinata.cloud/ipfs/${actualHash}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to retrieve from IPFS: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error retrieving from IPFS:', error);
    throw error;
  }
}

/**
 * Decrypt an encrypted IPFS hash
 * @param {string} encryptedHash - Encrypted hash (base64)
 * @param {string} walletAddress - Wallet address for decryption key
 * @returns {Promise<string>} - Decrypted IPFS hash
 */
export async function decryptHash(encryptedHash, walletAddress) {
  try {
    const keys = await getUserKeys(walletAddress);
    const decryptedHash = await unsealData(encryptedHash, keys.privateKey);
    return decryptedHash;
  } catch (error) {
    console.error('Error decrypting hash:', error);
    throw error;
  }
}

/**
 * Get contributions from localStorage
 * @returns {Array} - Array of contributions
 */
export function getLocalContributions() {
  try {
    const contributions = localStorage.getItem('contributions');
    return contributions ? JSON.parse(contributions) : [];
  } catch (error) {
    console.error('Error reading local contributions:', error);
    return [];
  }
}

/**
 * Save contribution to localStorage
 * @param {Object} contribution - Contribution data
 */
export function saveLocalContribution(contribution) {
  try {
    const contributions = getLocalContributions();
    contributions.push(contribution);
    localStorage.setItem('contributions', JSON.stringify(contributions));
  } catch (error) {
    console.error('Error saving contribution:', error);
  }
}

export default {
  uploadToIPFS,
  uploadToPinata,
  retrieveFromIPFS,
  decryptHash,
  getLocalContributions,
  saveLocalContribution
};

