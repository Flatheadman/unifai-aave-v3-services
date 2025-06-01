'use client';

import { useEffect, useState, use } from 'react';
import { ethers } from 'ethers';
import { AAVE_V3_SEPOLIA, AAVE_POOL_ABI, ERC20_ABI, TRANSACTION_CONFIGS } from '../../../lib/aave-config';
import type { TransactionData } from '../../../types';

// 交易执行器基类
abstract class TransactionExecutor {
  protected wallet: any;
  protected data: TransactionData;

  constructor(wallet: any, data: TransactionData) {
    this.wallet = wallet;
    this.data = data;
  }

  abstract needsApproval(): Promise<boolean>;
  abstract executeApproval(): Promise<string>;
  abstract executeTransaction(): Promise<string>;
  
  getStatusText(status: string): string {
    const config = TRANSACTION_CONFIGS[this.data.transactionType];
    switch (status) {
      case 'approving': return '✍️ Approving...';
      case 'executing': return `🔄 ${this.data.transactionType.charAt(0).toUpperCase() + this.data.transactionType.slice(1)}ing...`;
      case 'success': return '✅ Completed';
      case 'error': return '❌ Try Again';
      default: return `🚀 ${this.data.transactionType.charAt(0).toUpperCase() + this.data.transactionType.slice(1)}`;
    }
  }
}

// Supply 执行器
class SupplyExecutor extends TransactionExecutor {
  async needsApproval(): Promise<boolean> {
    const tokenContract = new ethers.Contract(this.data.params[0], ERC20_ABI, this.wallet.provider);
    const allowance = await tokenContract.allowance(this.wallet.address, AAVE_V3_SEPOLIA.POOL);
    return allowance < BigInt(this.data.params[1]);
  }

  async executeApproval(): Promise<string> {
    const tokenContract = new ethers.Contract(this.data.params[0], ERC20_ABI, this.wallet.signer);
    const tx = await tokenContract.approve(AAVE_V3_SEPOLIA.POOL, this.data.params[1]);
    return tx.hash;
  }

  async executeTransaction(): Promise<string> {
    const poolContract = new ethers.Contract(AAVE_V3_SEPOLIA.POOL, AAVE_POOL_ABI, this.wallet.signer);
    
    const tx = await poolContract.supply(
      this.data.params[0],     // asset
      this.data.params[1],     // amount
      this.wallet.address,     // onBehalfOf
      this.data.params[3]      // referralCode
    );
    
    return tx.hash;
  }
}

// Withdraw 执行器
class WithdrawExecutor extends TransactionExecutor {
  async needsApproval(): Promise<boolean> {
    // Withdraw 不需要 approval，因为是从 aToken 中提取
    return false;
  }

  async executeApproval(): Promise<string> {
    throw new Error('Withdraw does not require approval');
  }

  async executeTransaction(): Promise<string> {
    const poolContract = new ethers.Contract(AAVE_V3_SEPOLIA.POOL, AAVE_POOL_ABI, this.wallet.signer);
    
    const tx = await poolContract.withdraw(
      this.data.params[0],     // asset
      this.data.params[1],     // amount
      this.wallet.address      // to
    );
    
    return tx.hash;
  }
}

// Borrow 执行器
class BorrowExecutor extends TransactionExecutor {
  async needsApproval(): Promise<boolean> {
    // Borrow 不需要 approval
    return false;
  }

  async executeApproval(): Promise<string> {
    throw new Error('Borrow does not require approval');
  }

  async executeTransaction(): Promise<string> {
    const poolContract = new ethers.Contract(AAVE_V3_SEPOLIA.POOL, AAVE_POOL_ABI, this.wallet.signer);
    
    const tx = await poolContract.borrow(
      this.data.params[0],     // asset
      this.data.params[1],     // amount
      this.data.params[2],     // interestRateMode
      this.data.params[3],     // referralCode
      this.wallet.address      // onBehalfOf
    );
    
    return tx.hash;
  }
}

// Repay 执行器
class RepayExecutor extends TransactionExecutor {
  async needsApproval(): Promise<boolean> {
    const tokenContract = new ethers.Contract(this.data.params[0], ERC20_ABI, this.wallet.provider);
    const allowance = await tokenContract.allowance(this.wallet.address, AAVE_V3_SEPOLIA.POOL);
    return allowance < BigInt(this.data.params[1]);
  }

  async executeApproval(): Promise<string> {
    const tokenContract = new ethers.Contract(this.data.params[0], ERC20_ABI, this.wallet.signer);
    const tx = await tokenContract.approve(AAVE_V3_SEPOLIA.POOL, this.data.params[1]);
    return tx.hash;
  }

  async executeTransaction(): Promise<string> {
    const poolContract = new ethers.Contract(AAVE_V3_SEPOLIA.POOL, AAVE_POOL_ABI, this.wallet.signer);
    
    const tx = await poolContract.repay(
      this.data.params[0],     // asset
      this.data.params[1],     // amount
      this.data.params[2],     // interestRateMode
      this.wallet.address      // onBehalfOf
    );
    
    return tx.hash;
  }
}

// 执行器工厂
function createExecutor(wallet: any, data: TransactionData): TransactionExecutor {
  switch (data.transactionType) {
    case 'supply':
      return new SupplyExecutor(wallet, data);
    case 'withdraw':
      return new WithdrawExecutor(wallet, data);
    case 'borrow':
      return new BorrowExecutor(wallet, data);
    case 'repay':
      return new RepayExecutor(wallet, data);
    default:
      throw new Error(`Unsupported transaction type: ${data.transactionType}`);
  }
}

export default function TransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const [data, setData] = useState<TransactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [wallet, setWallet] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'approving' | 'executing' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string>('');
  const [approvalTxHash, setApprovalTxHash] = useState<string>('');

  // 加载交易数据
  useEffect(() => {
    fetch(`/api/tx/data/${id}`)
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error);
        }
      })
      .catch(() => setError('Failed to load transaction'))
      .finally(() => setLoading(false));
  }, [id]);

  // 连接钱包
  const connectWallet = async () => {
    try {
      if (!(window as any).ethereum) throw new Error('Please install MetaMask');
      
      await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      // 检查网络
      const network = await provider.getNetwork();
      if (network.chainId != 11155111n) {
        throw new Error('Please switch to Sepolia testnet');
      }
      
      setWallet({ provider, signer, address });
      setError(''); // 清除之前的错误
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 执行交易流程
  const executeTransaction = async () => {
    if (!wallet || !data) return;
    
    try {
      setError(''); // 清除之前的错误
      const executor = createExecutor(wallet, data);
      
      // 检查并处理授权
      const config = TRANSACTION_CONFIGS[data.transactionType];
      if (config.requiresApproval) {
        setStatus('approving');
        const needsApproval = await executor.needsApproval();
        
        if (needsApproval) {
          const approveTxHash = await executor.executeApproval();
          setApprovalTxHash(approveTxHash);
          
          // 等待授权交易确认
          await wallet.provider.waitForTransaction(approveTxHash);
        }
      }
      
      // 执行主交易
      setStatus('executing');
      const mainTxHash = await executor.executeTransaction();
      setTxHash(mainTxHash);
      
      // 等待主交易确认
      await wallet.provider.waitForTransaction(mainTxHash);
      setStatus('success');
      
    } catch (err: any) {
      console.error('Transaction execution failed:', err);
      setError(err.message || 'Transaction failed');
      setStatus('error');
    }
  };

  const getButtonText = () => {
    if (!data) return 'Loading...';
    const executor = createExecutor(wallet, data);
    return executor.getStatusText(status);
  };

  const getTransactionTypeDisplay = () => {
    if (!data) return '';
    return data.transactionType.charAt(0).toUpperCase() + data.transactionType.slice(1);
  };

  const getTransactionIcon = () => {
    if (!data) return '🔄';
    switch (data.transactionType) {
      case 'supply': return '💰';
      case 'withdraw': return '💸';
      case 'borrow': return '🏦';
      case 'repay': return '💳';
      default: return '🔄';
    }
  };

  if (loading) return <div style={styles.center}>Loading...</div>;
  if (error && !data) return <div style={styles.error}>❌ {error}</div>;
  if (!data) return <div style={styles.center}>Transaction not found</div>;

  return (
    <div style={styles.container}>
      <h1>{getTransactionIcon()} Aave V3 {getTransactionTypeDisplay()}</h1>
      
      {/* 交易详情 */}
      <div style={styles.card}>
        <h3>📋 Transaction Details</h3>
        <p><strong>Action:</strong> {getTransactionTypeDisplay()}</p>
        <p><strong>Description:</strong> {data.description}</p>
        <p><strong>Token:</strong> <code>{data.params[0]}</code></p>
        <p><strong>Amount:</strong> {data.params[1]}</p>
        <p><strong>Function:</strong> {data.functionName}</p>
        {TRANSACTION_CONFIGS[data.transactionType].requiresApproval && (
          <p><strong>Requires Approval:</strong> Yes</p>
        )}
      </div>

      {/* 网络提示 */}
      <div style={styles.warning}>
        ⚠️ Make sure you're on <strong>Sepolia Testnet</strong>
      </div>

      {/* 错误显示 */}
      {error && (
        <div style={styles.errorBanner}>
          ❌ {error}
        </div>
      )}

      {/* 钱包部分 */}
      {!wallet ? (
        <button onClick={connectWallet} style={styles.button}>
          🦊 Connect MetaMask
        </button>
      ) : (
        <div style={styles.card}>
          <p><strong>Connected:</strong> {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</p>
          
          {status === 'success' ? (
            <div style={styles.success}>
              <p>✅ {getTransactionTypeDisplay()} Transaction Complete!</p>
              {approvalTxHash && (
                <p>
                  Approval Tx: <a href={`https://sepolia.etherscan.io/tx/${approvalTxHash}`} target="_blank">
                    {approvalTxHash.slice(0, 10)}...
                  </a>
                </p>
              )}
              <p>
                Main Tx: <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank">
                  {txHash.slice(0, 10)}...
                </a>
              </p>
              <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" style={styles.link}>
                View on Etherscan →
              </a>
            </div>
          ) : (
            <button 
              onClick={executeTransaction}
              disabled={['approving', 'executing'].includes(status)}
              style={{
                ...styles.button,
                opacity: ['approving', 'executing'].includes(status) ? 0.6 : 1,
                background: status === 'error' ? '#dc3545' : '#007bff'
              }}
            >
              {getButtonText()}
            </button>
          )}
          
          {/* 进行中的交易状态 */}
          {status === 'approving' && approvalTxHash && (
            <div style={styles.pending}>
              <p>⏳ Approval transaction submitted</p>
              <p>
                Tx: <a href={`https://sepolia.etherscan.io/tx/${approvalTxHash}`} target="_blank">
                  {approvalTxHash.slice(0, 10)}...
                </a>
              </p>
            </div>
          )}
          
          {status === 'executing' && txHash && (
            <div style={styles.pending}>
              <p>⏳ {getTransactionTypeDisplay()} transaction submitted</p>
              <p>
                Tx: <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank">
                  {txHash.slice(0, 10)}...
                </a>
              </p>
            </div>
          )}
        </div>
      )}

      {/* 开发环境信息 */}
      {process.env.NODE_ENV === 'development' && (
        <div style={styles.debug}>
          <h4>🔧 Debug Info</h4>
          <p><strong>Transaction ID:</strong> {id}</p>
          <p><strong>Transaction Type:</strong> {data.transactionType}</p>
          <p><strong>Contract:</strong> {data.contractAddress}</p>
          <p><strong>Function:</strong> {data.functionName}</p>
          <details>
            <summary>Parameters</summary>
            <pre>{JSON.stringify(data.params, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

// 样式保持不变
const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, sans-serif',
  },
  center: {
    textAlign: 'center' as const,
    padding: '40px',
    fontSize: '18px',
  },
  error: {
    color: '#d32f2f',
    textAlign: 'center' as const,
    padding: '20px',
    background: '#ffebee',
    borderRadius: '8px',
    margin: '20px',
  },
  errorBanner: {
    background: '#f8d7da',
    color: '#721c24',
    padding: '10px 15px',
    borderRadius: '6px',
    marginBottom: '20px',
    border: '1px solid #f5c6cb',
  },
  card: {
    background: 'white',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  warning: {
    background: '#fff3cd',
    color: '#856404',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '20px',
    textAlign: 'center' as const,
    border: '1px solid #ffeaa7',
  },
  button: {
    width: '100%',
    padding: '15px',
    background: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  success: {
    background: '#d4edda',
    color: '#155724',
    padding: '15px',
    borderRadius: '6px',
    border: '1px solid #c3e6cb',
  },
  pending: {
    background: '#fff3e0',
    color: '#f57c00',
    padding: '15px',
    borderRadius: '6px',
    marginTop: '15px',
    border: '1px solid #ffcc02',
  },
  link: {
    color: '#007bff',
    textDecoration: 'none',
    fontWeight: 'bold',
  },
  debug: {
    background: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '6px',
    padding: '15px',
    marginTop: '20px',
    fontSize: '14px',
  },
};
