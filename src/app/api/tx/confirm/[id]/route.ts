import { NextRequest, NextResponse } from 'next/server';
import { markTransactionSuccessful } from '../../../../../lib/storage';
import { setCorsHeaders, handleOptionsRequest } from '../../../../../lib/cors';

export async function OPTIONS(req: NextRequest) {
  return handleOptionsRequest();
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { txHash, approvalTxHash } = body;

    if (!id) {
      return setCorsHeaders(NextResponse.json({ success: false, error: 'Transaction ID is required' }, { status: 400 }));
    }
    if (!txHash) {
      return setCorsHeaders(NextResponse.json({ success: false, error: 'Transaction hash (txHash) is required' }, { status: 400 }));
    }

    const success = await markTransactionSuccessful(id, txHash, approvalTxHash);

    if (success) {
      return setCorsHeaders(NextResponse.json({ success: true, message: 'Transaction marked as successful' }));
    } else {
      return setCorsHeaders(NextResponse.json({ success: false, error: 'Transaction not found or could not be updated' }, { status: 404 }));
    }
  } catch (error) {
    console.error('Error in /api/tx/confirm:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return setCorsHeaders(NextResponse.json({ success: false, error: errorMessage }, { status: 500 }));
  }
}