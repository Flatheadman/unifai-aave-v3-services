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

// Withdraw 交易构建器
class WithdrawTransactionBuilder extends TransactionBuilder {
  buildParams(): any[] {
    const amount = this.request.amount === 'max' 
      ? ethers.MaxUint256.toString() 
      : ethers.parseUnits(this.request.amount.toString(), this.getDecimals()).toString();
    
    return [
      this.request.tokenAddress,  // asset
      amount,                     // amount (MaxUint256 for withdrawing all)
      ethers.ZeroAddress          // to (前端替换为用户地址)
    ];
  }

  getContractAddress(): string {
    return AAVE_V3_SEPOLIA.POOL;
  }

  getABI(): any[] {
    return AAVE_POOL_ABI;
  }
}

// Borrow 交易构建器
class BorrowTransactionBuilder extends TransactionBuilder {
  buildParams(): any[] {
    return [
      this.request.tokenAddress,  // asset
      ethers.parseUnits(this.request.amount.toString(), this.getDecimals()).toString(),
      2,                          // interestRateMode (2 for variable rate)
      0,                          // referralCode
      ethers.ZeroAddress          // onBehalfOf (前端替换为用户地址)
    ];
  }

  getContractAddress(): string {
    return AAVE_V3_SEPOLIA.POOL;
  }

  getABI(): any[] {
    return AAVE_POOL_ABI;
  }
}

// Repay 交易构建器
class RepayTransactionBuilder extends TransactionBuilder {
  buildParams(): any[] {
    const amount = this.request.amount === 'max' 
      ? ethers.MaxUint256.toString() 
      : ethers.parseUnits(this.request.amount.toString(), this.getDecimals()).toString();
    
    return [
      this.request.tokenAddress,  // asset
      amount,                     // amount (MaxUint256 for repaying all)
      2,                          // interestRateMode (2 for variable rate)
      ethers.ZeroAddress          // onBehalfOf (前端替换为用户地址)
    ];
  }

  getContractAddress(): string {
    return AAVE_V3_SEPOLIA.POOL;
  }

  getABI(): any[] {
    return AAVE_POOL_ABI;
  }
}

// 工厂函数
export function createTransactionBuilder(request: AaveTransactionRequest): TransactionBuilder {
  switch (request.transactionType) {
    case 'supply':
      return new SupplyTransactionBuilder(request);
    case 'withdraw':
      return new WithdrawTransactionBuilder(request);
    case 'borrow':
      return new BorrowTransactionBuilder(request);
    case 'repay':
      return new RepayTransactionBuilder(request);
    default:
      throw new Error(`Unsupported transaction type: ${request.transactionType}`);
  }
}
