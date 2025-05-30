export interface TransactionData {
  contractAddress: string;
  functionName: string;
  params: any[];
  contractABI: any[];
  value?: string;
  createdAt: number;
  description: string;
  transactionType: 'supply' | 'withdraw' | 'borrow' | 'repay';
}

export interface AaveTransactionRequest {
  transactionType: 'supply' | 'withdraw' | 'borrow' | 'repay';
  tokenAddress: string;
  amount: string;
}