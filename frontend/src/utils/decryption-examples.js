/**
 * IPFS Hash Decryption Examples
 * 
 * This guide shows how to decrypt encrypted IPFS hashes
 */

import { decryptHash, getLocalContributions, retrieveFromIPFS } from './utils/ipfs.js';

// ============================================
// Method 1: Decrypt a single encrypted hash
// ============================================

async function decryptSingleHash() {
  const walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5';
  const encryptedHash = 'ABC123...base64string...'; // Your encrypted hash
  
  try {
    const decryptedHash = await decryptHash(encryptedHash, walletAddress);
    console.log('Decrypted IPFS Hash:', decryptedHash);
    console.log('View on IPFS:', `https://gateway.pinata.cloud/ipfs/${decryptedHash}`);
  } catch (error) {
    console.error('Decryption failed:', error);
  }
}

// ============================================
// Method 2: Decrypt all your contributions
// ============================================

async function decryptAllContributions() {
  const contributions = getLocalContributions();
  const walletAddress = localStorage.getItem('walletAddress');
  
  if (!walletAddress) {
    console.error('No wallet connected');
    return;
  }
  
  console.log(`Found ${contributions.length} contributions`);
  
  for (const contribution of contributions) {
    if (contribution.encryptedHash) {
      try {
        const decryptedHash = await decryptHash(contribution.encryptedHash, walletAddress);
        console.log('Contribution:', {
          type: contribution.type,
          projectName: contribution.projectName,
          timestamp: contribution.timestamp,
          plainHash: contribution.hash,
          decryptedHash: decryptedHash,
          match: contribution.hash === decryptedHash ? '✅' : '❌'
        });
      } catch (error) {
        console.error('Failed to decrypt contribution:', contribution.uniqueId, error);
      }
    }
  }
}

// ============================================
// Method 3: Retrieve data using encrypted hash
// ============================================

async function retrieveUsingEncryptedHash() {
  const walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5';
  const encryptedHash = 'ABC123...base64string...';
  
  try {
    // retrieveFromIPFS will automatically decrypt if needed
    const data = await retrieveFromIPFS(encryptedHash, walletAddress);
    console.log('Retrieved data:', data);
  } catch (error) {
    console.error('Retrieval failed:', error);
  }
}

// ============================================
// Method 4: Browser Console Commands
// ============================================

/*
// Run these commands in your browser console:

// 1. Get your wallet address
const wallet = localStorage.getItem('walletAddress');
console.log('Wallet:', wallet);

// 2. Get all contributions
const contributions = JSON.parse(localStorage.getItem('contributions') || '[]');
console.log('Contributions:', contributions);

// 3. Import the decryption function
import { decryptHash } from '/src/utils/ipfs.js';

// 4. Decrypt a hash
const encryptedHash = contributions[0].encryptedHash;
const decrypted = await decryptHash(encryptedHash, wallet);
console.log('Decrypted:', decrypted);

// 5. Verify it matches
console.log('Match:', contributions[0].hash === decrypted);
*/

// ============================================
// Method 5: Decrypt in React Component
// ============================================

/*
import { decryptHash } from '../../utils/ipfs';

function MyContributions() {
  const [contributions, setContributions] = useState([]);
  const [walletAddress, setWalletAddress] = useState('');
  
  useEffect(() => {
    const wallet = localStorage.getItem('walletAddress');
    setWalletAddress(wallet);
    
    const stored = JSON.parse(localStorage.getItem('contributions') || '[]');
    setContributions(stored);
  }, []);
  
  const handleDecrypt = async (encryptedHash) => {
    try {
      const decrypted = await decryptHash(encryptedHash, walletAddress);
      alert(`Decrypted hash: ${decrypted}`);
      window.open(`https://gateway.pinata.cloud/ipfs/${decrypted}`, '_blank');
    } catch (error) {
      alert('Decryption failed: ' + error.message);
    }
  };
  
  return (
    <div>
      {contributions.map((contrib, index) => (
        <div key={index}>
          <h3>{contrib.projectName}</h3>
          <p>Type: {contrib.type}</p>
          <p>Plain Hash: {contrib.hash}</p>
          <p>Encrypted Hash: {contrib.encryptedHash?.substring(0, 20)}...</p>
          <button onClick={() => handleDecrypt(contrib.encryptedHash)}>
            Decrypt & View
          </button>
        </div>
      ))}
    </div>
  );
}
*/

// ============================================
// Export for use
// ============================================

export {
  decryptSingleHash,
  decryptAllContributions,
  retrieveUsingEncryptedHash
};
