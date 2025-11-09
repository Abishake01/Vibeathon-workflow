"""
Web3 Nodes
Dynamic nodes for blockchain and wallet operations
"""
from ..dynamic_nodes import node_registry, NodeParameter, ParameterType
from typing import Dict, Any, Optional
import json
import hashlib
import secrets

try:
    from eth_account import Account
    from eth_account.messages import encode_defunct
    ETH_ACCOUNT_AVAILABLE = True
except ImportError:
    ETH_ACCOUNT_AVAILABLE = False
    Account = None
    encode_defunct = None

try:
    from web3 import Web3
    WEB3_AVAILABLE = True
except ImportError:
    WEB3_AVAILABLE = False
    Web3 = None


@node_registry.register(
    node_id="web3-wallet-connect",
    name="Wallet Connect",
    description="Connect to MetaMask, Phantom, Coinbase, or WalletConnect",
    category="Web3",
    icon="🔗",
    color="#f59e0b",
    input_handles=[],  # No inputs - this is a starting node
    output_handles=['main'],  # Outputs wallet connection info
    parameters=[
        NodeParameter(
            name="wallet_type",
            label="Wallet Type",
            type=ParameterType.SELECT,
            required=True,
            options=["metamask", "phantom", "coinbase", "walletconnect"],
            default="metamask",
            description="Type of wallet to connect"
        ),
        NodeParameter(
            name="chain",
            label="Chain",
            type=ParameterType.SELECT,
            required=False,
            options=["ethereum", "polygon", "bsc", "avalanche", "solana"],
            default="ethereum",
            description="Blockchain network"
        )
    ]
)
async def wallet_connect(
    inputs: Dict[str, Any],
    context: Dict[str, Any],
    wallet_type: str = "metamask",
    chain: str = "ethereum"
) -> Dict[str, Any]:
    """
    Connect to a wallet (MetaMask, Phantom, Coinbase, WalletConnect)
    Note: Actual connection happens on frontend, this node prepares the request
    """
    return {
        'main': {
            'wallet_type': wallet_type,
            'chain': chain,
            'status': 'pending',
            'message': f'Requesting connection to {wallet_type} on {chain}',
            'requires_frontend': True,
            'action': 'connect_wallet',
            'wallet_type': wallet_type,
            'chain': chain
        }
    }


@node_registry.register(
    node_id="web3-get-wallet-address",
    name="Get Wallet Address",
    description="Returns user wallet address after connection",
    category="Web3",
    icon="👛",
    color="#3b82f6",
    input_handles=['main'],  # Can receive wallet connection data
    output_handles=['main'],  # Outputs wallet address
    parameters=[
        NodeParameter(
            name="wallet_address",
            label="Wallet Address",
            type=ParameterType.TEXT,
            required=False,
            placeholder="${{ $json.address }}",
            description="Wallet address from previous node or input"
        )
    ]
)
async def get_wallet_address(
    inputs: Dict[str, Any],
    context: Dict[str, Any],
    wallet_address: str = ""
) -> Dict[str, Any]:
    """Get wallet address from input or context"""
    # Try to get from parameter first
    address = wallet_address
    
    # If not provided, try to get from inputs
    if not address:
        input_data = inputs.get('main', {})
        address = input_data.get('address') or input_data.get('wallet_address') or input_data.get('account')
    
    # Try context
    if not address:
        address = context.get('wallet_address') or context.get('$vars', {}).get('wallet_address')
    
    if not address:
        return {
            'main': {
                'error': 'No wallet address provided',
                'address': None
            }
        }
    
    # Validate address format (basic check)
    is_valid = False
    if isinstance(address, str):
        # Ethereum address format (0x followed by 40 hex chars)
        if address.startswith('0x') and len(address) == 42:
            is_valid = True
        # Solana address format (base58, typically 32-44 chars)
        elif len(address) >= 32 and len(address) <= 44:
            is_valid = True
    
    return {
        'main': {
            'address': address,
            'is_valid': is_valid,
            'chain': 'ethereum' if address.startswith('0x') else 'solana' if is_valid else 'unknown'
        }
    }


@node_registry.register(
    node_id="web3-wallet-info",
    name="Wallet Info / Profile",
    description="Returns chain, network, balance summary, ENS/SNS name, avatar",
    category="Web3",
    icon="ℹ️",
    color="#10b981",
    input_handles=['main'],  # Receives wallet address
    output_handles=['main'],  # Outputs wallet info
    parameters=[
        NodeParameter(
            name="wallet_address",
            label="Wallet Address",
            type=ParameterType.TEXT,
            required=True,
            placeholder="${{ $json.address }}",
            description="Wallet address to get info for"
        ),
        NodeParameter(
            name="chain",
            label="Chain",
            type=ParameterType.SELECT,
            required=False,
            options=["ethereum", "polygon", "bsc", "avalanche", "solana"],
            default="ethereum",
            description="Blockchain network"
        ),
        NodeParameter(
            name="include_ens",
            label="Include ENS/SNS",
            type=ParameterType.BOOLEAN,
            required=False,
            default=True,
            description="Fetch ENS (Ethereum) or SNS (Solana) name"
        )
    ]
)
async def wallet_info(
    inputs: Dict[str, Any],
    context: Dict[str, Any],
    wallet_address: str,
    chain: str = "ethereum",
    include_ens: bool = True
) -> Dict[str, Any]:
    """Get wallet information including balance, ENS/SNS, etc."""
    # This would typically call blockchain RPC endpoints
    # For now, return structure that can be populated by actual web3 calls
    
    result = {
        'address': wallet_address,
        'chain': chain,
        'network': chain,
        'balance': {
            'native': '0',
            'usd_value': '0'
        },
        'ens_name': None,
        'sns_name': None,
        'avatar': None,
        'requires_rpc': True
    }
    
    # If we have Web3 configured, try to get balance
    try:
        if chain in ['ethereum', 'polygon', 'bsc', 'avalanche'] and wallet_address.startswith('0x'):
            # This would require RPC endpoint configuration
            # result['balance']['native'] = str(w3.eth.get_balance(wallet_address))
            pass
    except Exception as e:
        result['error'] = f'Failed to fetch balance: {str(e)}'
    
    return {
        'main': result
    }


@node_registry.register(
    node_id="web3-get-token-balances",
    name="Get Token Balances",
    description="Returns all ERC20/SPL token balances of a wallet",
    category="Web3",
    icon="🪙",
    color="#8b5cf6",
    input_handles=['main'],  # Receives wallet address
    output_handles=['main'],  # Outputs token balances
    parameters=[
        NodeParameter(
            name="wallet_address",
            label="Wallet Address",
            type=ParameterType.TEXT,
            required=True,
            placeholder="${{ $json.address }}",
            description="Wallet address to get token balances for"
        ),
        NodeParameter(
            name="chain",
            label="Chain",
            type=ParameterType.SELECT,
            required=False,
            options=["ethereum", "polygon", "bsc", "avalanche", "solana"],
            default="ethereum",
            description="Blockchain network"
        ),
        NodeParameter(
            name="token_contracts",
            label="Token Contracts (Optional)",
            type=ParameterType.TEXTAREA,
            required=False,
            placeholder="0x...\n0x...",
            description="Specific token contract addresses (one per line). Leave empty for all tokens."
        )
    ]
)
async def get_token_balances(
    inputs: Dict[str, Any],
    context: Dict[str, Any],
    wallet_address: str,
    chain: str = "ethereum",
    token_contracts: str = ""
) -> Dict[str, Any]:
    """Get ERC20/SPL token balances for a wallet"""
    contracts = []
    if token_contracts:
        contracts = [c.strip() for c in token_contracts.split('\n') if c.strip()]
    
    result = {
        'address': wallet_address,
        'chain': chain,
        'tokens': [],
        'total_usd_value': '0',
        'requires_rpc': True
    }
    
    # This would typically:
    # 1. For Ethereum: Query ERC20 token contracts
    # 2. For Solana: Query SPL token accounts
    # 3. Get token metadata (name, symbol, decimals)
    # 4. Calculate USD values
    
    return {
        'main': result
    }


@node_registry.register(
    node_id="web3-get-nft-holdings",
    name="Get NFT Holdings",
    description="Returns list of NFTs owned (metadata + images)",
    category="Web3",
    icon="🖼️",
    color="#ec4899",
    input_handles=['main'],  # Receives wallet address
    output_handles=['main'],  # Outputs NFT holdings
    parameters=[
        NodeParameter(
            name="wallet_address",
            label="Wallet Address",
            type=ParameterType.TEXT,
            required=True,
            placeholder="${{ $json.address }}",
            description="Wallet address to get NFTs for"
        ),
        NodeParameter(
            name="chain",
            label="Chain",
            type=ParameterType.SELECT,
            required=False,
            options=["ethereum", "polygon", "bsc", "avalanche", "solana"],
            default="ethereum",
            description="Blockchain network"
        ),
        NodeParameter(
            name="limit",
            label="Limit",
            type=ParameterType.NUMBER,
            required=False,
            default=50,
            description="Maximum number of NFTs to return"
        )
    ]
)
async def get_nft_holdings(
    inputs: Dict[str, Any],
    context: Dict[str, Any],
    wallet_address: str,
    chain: str = "ethereum",
    limit: int = 50
) -> Dict[str, Any]:
    """Get NFT holdings for a wallet"""
    result = {
        'address': wallet_address,
        'chain': chain,
        'nfts': [],
        'total_count': 0,
        'requires_rpc': True
    }
    
    # This would typically:
    # 1. Query NFT contracts (ERC721/ERC1155 for Ethereum, Metaplex for Solana)
    # 2. Fetch metadata from IPFS/Arweave
    # 3. Get images and attributes
    # 4. Return structured NFT data
    
    return {
        'main': result
    }


@node_registry.register(
    node_id="web3-sign-message",
    name="Sign Message",
    description="User signs arbitrary data (auth login, terms confirmation, etc.)",
    category="Web3",
    icon="✍️",
    color="#f97316",
    input_handles=['main'],  # Can receive message data
    output_handles=['main'],  # Outputs signature
    parameters=[
        NodeParameter(
            name="message",
            label="Message",
            type=ParameterType.TEXTAREA,
            required=True,
            placeholder="Sign this message to authenticate",
            description="Message to sign"
        ),
        NodeParameter(
            name="wallet_address",
            label="Wallet Address",
            type=ParameterType.TEXT,
            required=False,
            placeholder="${{ $json.address }}",
            description="Wallet address that will sign (optional, can come from context)"
        )
    ]
)
async def sign_message(
    inputs: Dict[str, Any],
    context: Dict[str, Any],
    message: str,
    wallet_address: str = ""
) -> Dict[str, Any]:
    """Request message signature from wallet"""
    # Get wallet address from context if not provided
    if not wallet_address:
        input_data = inputs.get('main', {})
        wallet_address = input_data.get('address') or context.get('wallet_address')
    
    return {
        'main': {
            'message': message,
            'wallet_address': wallet_address,
            'status': 'pending',
            'requires_frontend': True,
            'action': 'sign_message',
            'message': message
        }
    }


@node_registry.register(
    node_id="web3-verify-signature",
    name="Verify Signature",
    description="Validates authenticity of the signed message",
    category="Web3",
    icon="✅",
    color="#22c55e",
    input_handles=['main'],  # Receives signature data
    output_handles=['main'],  # Outputs verification result
    parameters=[
        NodeParameter(
            name="message",
            label="Original Message",
            type=ParameterType.TEXTAREA,
            required=True,
            placeholder="Sign this message to authenticate",
            description="Original message that was signed"
        ),
        NodeParameter(
            name="signature",
            label="Signature",
            type=ParameterType.TEXT,
            required=True,
            placeholder="${{ $json.signature }}",
            description="Signature to verify"
        ),
        NodeParameter(
            name="wallet_address",
            label="Wallet Address",
            type=ParameterType.TEXT,
            required=True,
            placeholder="${{ $json.address }}",
            description="Wallet address that signed the message"
        ),
        NodeParameter(
            name="chain",
            label="Chain",
            type=ParameterType.SELECT,
            required=False,
            options=["ethereum", "polygon", "bsc", "avalanche", "solana"],
            default="ethereum",
            description="Blockchain network"
        )
    ]
)
async def verify_signature(
    inputs: Dict[str, Any],
    context: Dict[str, Any],
    message: str,
    signature: str,
    wallet_address: str,
    chain: str = "ethereum"
) -> Dict[str, Any]:
    """Verify a message signature"""
    is_valid = False
    recovered_address = None
    
    if not ETH_ACCOUNT_AVAILABLE:
        return {
            'main': {
                'is_valid': False,
                'error': 'eth-account library not installed. Install with: pip install eth-account',
                'message': message,
                'signature': signature,
                'wallet_address': wallet_address
            }
        }
    
    try:
        if chain in ['ethereum', 'polygon', 'bsc', 'avalanche'] and wallet_address.startswith('0x'):
            # Ethereum signature verification
            try:
                # Encode message in Ethereum format
                encoded_message = encode_defunct(text=message)
                # Recover address from signature
                recovered_address = Account.recover_message(encoded_message, signature=signature)
                # Check if recovered address matches
                is_valid = recovered_address.lower() == wallet_address.lower()
            except Exception as e:
                return {
                    'main': {
                        'is_valid': False,
                        'error': f'Signature verification failed: {str(e)}',
                        'message': message,
                        'signature': signature,
                        'wallet_address': wallet_address,
                        'recovered_address': None
                    }
                }
        elif chain == 'solana':
            # Solana signature verification would go here
            # This requires solana-py library
            pass
    except Exception as e:
        return {
            'main': {
                'is_valid': False,
                'error': f'Verification error: {str(e)}',
                'message': message,
                'signature': signature,
                'wallet_address': wallet_address
            }
        }
    
    return {
        'main': {
            'is_valid': is_valid,
            'message': message,
            'signature': signature,
            'wallet_address': wallet_address,
            'recovered_address': recovered_address,
            'chain': chain
        }
    }


@node_registry.register(
    node_id="web3-generate-guest-wallet",
    name="Generate Guest Wallet",
    description="Creates ephemeral wallet without requiring external wallet",
    category="Web3",
    icon="🎭",
    color="#6366f1",
    input_handles=[],  # No inputs needed
    output_handles=['main'],  # Outputs generated wallet info
    parameters=[
        NodeParameter(
            name="chain",
            label="Chain",
            type=ParameterType.SELECT,
            required=False,
            options=["ethereum", "polygon", "bsc", "avalanche", "solana"],
            default="ethereum",
            description="Blockchain network for the wallet"
        )
    ]
)
async def generate_guest_wallet(
    inputs: Dict[str, Any],
    context: Dict[str, Any],
    chain: str = "ethereum"
) -> Dict[str, Any]:
    """Generate a temporary guest wallet"""
    if not ETH_ACCOUNT_AVAILABLE:
        return {
            'main': {
                'error': 'eth-account library not installed. Install with: pip install eth-account',
                'chain': chain
            }
        }
    
    try:
        if chain in ['ethereum', 'polygon', 'bsc', 'avalanche']:
            # Generate Ethereum account
            account = Account.create()
            private_key = account.key.hex()
            address = account.address
            
            return {
                'main': {
                    'address': address,
                    'private_key': private_key,
                    'chain': chain,
                    'type': 'ethereum',
                    'warning': 'Keep private key secure! This is a temporary wallet.',
                    'mnemonic': None  # Could generate mnemonic if needed
                }
            }
        elif chain == 'solana':
            # Solana wallet generation would go here
            # This requires solana-py library
            return {
                'main': {
                    'address': None,
                    'private_key': None,
                    'chain': chain,
                    'type': 'solana',
                    'error': 'Solana wallet generation not yet implemented',
                    'requires_solana_lib': True
                }
            }
        else:
            return {
                'main': {
                    'error': f'Unsupported chain: {chain}',
                    'chain': chain
                }
            }
    except Exception as e:
        return {
            'main': {
                'error': f'Failed to generate wallet: {str(e)}',
                'chain': chain
            }
        }


@node_registry.register(
    node_id="web3-switch-network",
    name="Switch Network",
    description="Programmatically request network switch (ETH → Polygon, etc.)",
    category="Web3",
    icon="🔄",
    color="#06b6d4",
    input_handles=['main'],  # Can receive chain info
    output_handles=['main'],  # Outputs switch result
    parameters=[
        NodeParameter(
            name="target_chain",
            label="Target Chain",
            type=ParameterType.SELECT,
            required=True,
            options=["ethereum", "polygon", "bsc", "avalanche", "arbitrum", "optimism"],
            default="polygon",
            description="Target blockchain network"
        ),
        NodeParameter(
            name="chain_id",
            label="Chain ID (Optional)",
            type=ParameterType.NUMBER,
            required=False,
            description="Specific chain ID (overrides target_chain if provided)"
        )
    ]
)
async def switch_network(
    inputs: Dict[str, Any],
    context: Dict[str, Any],
    target_chain: str = "polygon",
    chain_id: Optional[int] = None
) -> Dict[str, Any]:
    """Request network switch in wallet"""
    # Chain ID mapping
    chain_ids = {
        'ethereum': 1,
        'polygon': 137,
        'bsc': 56,
        'avalanche': 43114,
        'arbitrum': 42161,
        'optimism': 10
    }
    
    final_chain_id = chain_id or chain_ids.get(target_chain, 1)
    
    return {
        'main': {
            'target_chain': target_chain,
            'chain_id': final_chain_id,
            'status': 'pending',
            'requires_frontend': True,
            'action': 'switch_network',
            'chain_id': final_chain_id,
            'chain_name': target_chain
        }
    }

