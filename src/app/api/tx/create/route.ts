import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { storeTransaction } from '../../../../lib/storage';
import { isSupportedToken, isValidTransactionType } from '../../../../lib/aave-config';
import { createTransactionBuilder } from '../../../../lib/transaction-builder';
import { setCorsHeaders, handleOptionsRequest } from '../../../../lib/cors';
import type { AaveTransactionRequest } from '../../../../types';

function validateRequest(body: any): AaveTransactionRequest {
  const { transactionType, tokenAddress, amount } = body.payload;
  
  if (!isValidTransactionType(transactionType)) {
    throw new Error(`Invalid transaction type. Supported: supply, withdraw, borrow, repay`);
  }
  
  if (!ethers.isAddress(tokenAddress) || !isSupportedToken(tokenAddress)) {
    throw new Error(`Invalid token.`);
  }
  
  if (!amount || Number(amount) <= 0) {
    throw new Error('Invalid amount');
  }

  return { transactionType, tokenAddress, amount };
}

// 处理 OPTIONS 请求 (预检请求)
export async function OPTIONS(req: NextRequest) {
  return handleOptionsRequest();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Received body:', body);
    const request = validateRequest(body);
    
    // 使用工厂创建对应的交易构建器
    const builder = createTransactionBuilder(request);
    const transactionData = builder.build();

    const id = await storeTransaction(transactionData);
    const pageUrl = `${req.nextUrl.origin}/transaction/${id}`;

    const response = NextResponse.json({
      message: `Transaction created, ask the user to approve it in 15 minutes at ${pageUrl}`,
      success: true,
      // pageUrl,
      // transactionId: id,
      // transactionType: request.transactionType
    });

    return setCorsHeaders(response);

  } catch (error) {
    const response = NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create transaction'
    }, { status: 400 });
    
    return setCorsHeaders(response);
  }
}
