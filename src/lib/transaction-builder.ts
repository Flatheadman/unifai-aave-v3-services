// lib/transaction-builder.ts
import { ethers } from 'ethers';
import { AAVE_V3_SEPOLIA, AAVE_POOL_ABI, TRANSACTION_CONFIGS, getTokenName } from './aave-config';
import type { TransactionData, AaveTransactionRequest } from '../types';

// 交易构建器基类
abstract class TransactionBuilder {
  protected request: AaveTransactionRequest;

  constructor(request: AaveTransactionRequest) {
    this.request = request;
  }

  abstract buildParams(): any[];
  abstract getContractAddress(): string;
  abstract getABI(): any[];

  getDecimals(): number {
    return AAVE_V3_SEPOLIA.TOKENDECIMALS[this.request.tokenAddress as keyof typeof AAVE_V3_SEPOLIA.TOKENDECIMALS];
  }

  build(): TransactionData {
    const config = TRANSACTION_CONFIGS[this.request.transactionType];
    const tokenName = getTokenName(this.request.tokenAddress);
    // const decimals = AAVE_V3_SEPOLIA.TOKENDECIMALS[this.request.tokenAddress as keyof typeof AAVE_V3_SEPOLIA.TOKENDECIMALS];
    const amountFormatted = this.request.amount;

    return {
      contractAddress: this.getContractAddress(),
      functionName: config.functionName,
      params: this.buildParams(),
      contractABI: this.getABI(),
      value: '0',
      createdAt: Date.now(),
      description: config.description(tokenName, amountFormatted),
      transactionType: this.request.transactionType
    };
  }
}

// Supply 交易构建器
class SupplyTransactionBuilder extends TransactionBuilder {
  buildParams(): any[] {
    return [
      this.request.tokenAddress,  // asset
      // this.request.amount,        // amount
      ethers.parseUnits(this.request.amount.toString(), this.getDecimals()).toString(),
      ethers.ZeroAddress,         // onBehalfOf (前端替换为用户地址)
      0                           // referralCode
    ];
  }

  getContractAddress(): string {
    return AAVE_V3_SEPOLIA.POOL;
  }

  getABI(): any[] {
    return AAVE_POOL_ABI;
  }
}

// TODO: 其他交易构建器类似实现
// class WithdrawTransactionBuilder extends TransactionBuilder { ... }
// class BorrowTransactionBuilder extends TransactionBuilder { ... }
// class RepayTransactionBuilder extends TransactionBuilder { ... }

// 工厂函数
export function createTransactionBuilder(request: AaveTransactionRequest): TransactionBuilder {
  switch (request.transactionType) {
    case 'supply':
      return new SupplyTransactionBuilder(request);
    case 'withdraw':
      throw new Error('Withdraw transaction not implemented yet');
    case 'borrow':
      throw new Error('Borrow transaction not implemented yet');
    case 'repay':
      throw new Error('Repay transaction not implemented yet');
    default:
      throw new Error(`Unsupported transaction type: ${request.transactionType}`);
  }
}
