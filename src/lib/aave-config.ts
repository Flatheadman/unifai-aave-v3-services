export const AAVE_V3_SEPOLIA = {
  POOL: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
  POOL_DATA_PROVIDER: "0x3e9708d80f7B3e43118013075F7e95CE3AB31F31",
  
  TOKENS: {
    USDC: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",
    LINK: "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5",
    USDT: "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0", 
    DAI: "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357",
    WETH: "0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c",
    WBTC: "0x29f2D40B0605204364af54EC677bD022dA425d03",
    AAVE: "0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a",
    EURS: "0x6d906e526a4e2Ca02097BA9d0caA3c382F52278E",
    GHO: "0xc4bF5CbDaBE595361438F8c6a187bDc330539c60",
  },
  TOKENDECIMALS: {
    "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8": 6,  // USDC
    "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5": 18, // LINK
    "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0": 6,  // USDT
    "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357": 18, // DAI
    "0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c": 18, // WETH
    "0x29f2D40B0605204364af54EC677bD022dA425d03": 8,  // WBTC
    "0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a": 18, // AAVE
    "0x6d906e526a4e2Ca02097BA9d0caA3c382F52278E": 2,  // EURS
    "0xc4bF5CbDaBE595361438F8c6a187bDc330539c60": 18, // GHO
  }

};

// 使用官方生成的 ABI
export const AAVE_POOL_ABI = [
  // supply 函数
  {
    "inputs": [
      {"internalType": "address", "name": "asset", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "address", "name": "onBehalfOf", "type": "address"},
      {"internalType": "uint16", "name": "referralCode", "type": "uint16"}
    ],
    "name": "supply",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // withdraw 函数 (后续需要)
  {
    "inputs": [
      {"internalType": "address", "name": "asset", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "address", "name": "to", "type": "address"}
    ],
    "name": "withdraw",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // borrow 函数 (后续需要)
  {
    "inputs": [
      {"internalType": "address", "name": "asset", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "uint256", "name": "interestRateMode", "type": "uint256"},
      {"internalType": "uint16", "name": "referralCode", "type": "uint16"},
      {"internalType": "address", "name": "onBehalfOf", "type": "address"}
    ],
    "name": "borrow",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // repay 函数 (后续需要)
  {
    "inputs": [
      {"internalType": "address", "name": "asset", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "uint256", "name": "interestRateMode", "type": "uint256"},
      {"internalType": "address", "name": "onBehalfOf", "type": "address"}
    ],
    "name": "repay",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// ERC20 ABI (标准函数)
export const ERC20_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// 交易类型配置
export const TRANSACTION_CONFIGS = {
  supply: {
    functionName: 'supply',
    description: (tokenName: string, amount: string) => `Supply ${amount} ${tokenName} to Aave V3`,
    requiresApproval: true,
  },
  withdraw: {
    functionName: 'withdraw',
    description: (tokenName: string, amount: string) => `Withdraw ${amount} ${tokenName} from Aave V3`,
    requiresApproval: false,
  },
  borrow: {
    functionName: 'borrow',
    description: (tokenName: string, amount: string) => `Borrow ${amount} ${tokenName} from Aave V3`,
    requiresApproval: false,
  },
  repay: {
    functionName: 'repay',
    description: (tokenName: string, amount: string) => `Repay ${amount} ${tokenName} to Aave V3`,
    requiresApproval: true,
  }
};


// 其他工具函数保持不变...
export function isSupportedToken(tokenAddress: string): boolean {
  const supportedTokens = Object.values(AAVE_V3_SEPOLIA.TOKENS).map(addr => addr.toLowerCase());
  return supportedTokens.includes(tokenAddress.toLowerCase());
}

export function getTokenName(tokenAddress: string): string {
  const tokens = AAVE_V3_SEPOLIA.TOKENS;
  for (const [name, address] of Object.entries(tokens)) {
    if (address.toLowerCase() === tokenAddress.toLowerCase()) {
      return name;
    }
  }
  return 'Unknown Token';
}

export function isValidTransactionType(type: string): type is keyof typeof TRANSACTION_CONFIGS {
  return type in TRANSACTION_CONFIGS;
}