/**
 * Wallet Connection Utilities
 * Handles connections to various wallet providers
 */

/**
 * Connect to MetaMask wallet
 */
export async function connectMetaMask() {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask is not installed. Please install MetaMask extension.');
  }

  try {
    // Check if already connected first
    const existingAccounts = await window.ethereum.request({
      method: 'eth_accounts',
    });

    // If already connected, return existing account
    if (existingAccounts.length > 0) {
      console.log('✅ MetaMask already connected:', existingAccounts[0]);
      return {
        address: existingAccounts[0],
        chainId: await window.ethereum.request({ method: 'eth_chainId' }),
        provider: 'metamask',
        alreadyConnected: true
      };
    }

    // Request connection (this will show the popup)
    console.log('🔗 Requesting MetaMask connection...');
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (accounts.length === 0) {
      throw new Error('No accounts found');
    }

    console.log('✅ MetaMask connection approved:', accounts[0]);
    return {
      address: accounts[0],
      chainId: await window.ethereum.request({ method: 'eth_chainId' }),
      provider: 'metamask',
      alreadyConnected: false
    };
  } catch (error) {
    if (error.code === 4001) {
      throw new Error('User rejected the connection request');
    }
    throw error;
  }
}

/**
 * Connect to Phantom wallet (Solana)
 */
export async function connectPhantom() {
  if (typeof window.solana === 'undefined' || !window.solana.isPhantom) {
    throw new Error('Phantom wallet is not installed. Please install Phantom extension.');
  }

  try {
    const resp = await window.solana.connect();
    return {
      address: resp.publicKey.toString(),
      chainId: null, // Solana doesn't use chain IDs
      provider: 'phantom'
    };
  } catch (error) {
    if (error.code === 4001) {
      throw new Error('User rejected the connection request');
    }
    throw error;
  }
}

/**
 * Connect to Coinbase Wallet
 */
export async function connectCoinbase() {
  if (typeof window.ethereum === 'undefined' || !window.ethereum.isCoinbaseWallet) {
    throw new Error('Coinbase Wallet is not installed. Please install Coinbase Wallet extension.');
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (accounts.length === 0) {
      throw new Error('No accounts found');
    }

    return {
      address: accounts[0],
      chainId: await window.ethereum.request({ method: 'eth_chainId' }),
      provider: 'coinbase'
    };
  } catch (error) {
    if (error.code === 4001) {
      throw new Error('User rejected the connection request');
    }
    throw error;
  }
}

/**
 * Connect to WalletConnect (requires WalletConnect SDK)
 * Note: This is a placeholder - full implementation requires WalletConnect SDK setup
 */
export async function connectWalletConnect() {
  // WalletConnect requires additional SDK setup
  // This is a placeholder implementation
  throw new Error('WalletConnect integration requires additional SDK setup. Please use MetaMask, Phantom, or Coinbase Wallet for now.');
}

/**
 * Switch network on connected wallet
 */
export async function switchNetwork(chainId) {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('No Ethereum wallet found');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
    return { success: true };
  } catch (error) {
    // If chain doesn't exist, try to add it
    if (error.code === 4902) {
      // Chain not added - would need to add it with wallet_addEthereumChain
      throw new Error(`Network with chain ID ${chainId} is not added to your wallet. Please add it manually.`);
    }
    throw error;
  }
}

/**
 * Connect to wallet based on wallet type
 */
export async function connectWallet(walletType, chain = 'ethereum') {
  const walletTypeLower = walletType.toLowerCase();

  switch (walletTypeLower) {
    case 'metamask':
      return await connectMetaMask();
    
    case 'phantom':
      if (chain !== 'solana') {
        console.warn('Phantom wallet is for Solana. Switching chain to solana.');
      }
      return await connectPhantom();
    
    case 'coinbase':
    case 'coinbasewallet':
      return await connectCoinbase();
    
    case 'walletconnect':
      return await connectWalletConnect();
    
    default:
      throw new Error(`Unsupported wallet type: ${walletType}`);
  }
}

/**
 * Get current connected wallet address
 */
export async function getConnectedWallet(walletType = 'metamask') {
  const walletTypeLower = walletType.toLowerCase();

  if (walletTypeLower === 'phantom') {
    if (typeof window.solana === 'undefined' || !window.solana.isPhantom) {
      return null;
    }
    if (window.solana.isConnected) {
      return window.solana.publicKey.toString();
    }
    return null;
  } else {
    // Ethereum-based wallets
    if (typeof window.ethereum === 'undefined') {
      return null;
    }
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_accounts',
      });
      return accounts.length > 0 ? accounts[0] : null;
    } catch (error) {
      console.error('Error getting connected wallet:', error);
      return null;
    }
  }
}

