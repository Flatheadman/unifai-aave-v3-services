import { NextRequest, NextResponse } from 'next/server';
import { getTransaction } from '../../../../lib/storage';
import { setCorsHeaders, handleOptionsRequest } from '../../../../lib/cors';

// 处理 OPTIONS 请求 (预检请求)
export async function OPTIONS(req: NextRequest) {
  return handleOptionsRequest();
}

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getTransaction(id);
    
    if (!data) {
      const response = NextResponse.json({ 
        error: 'Transaction not found or expired' 
      }, { status: 404 });
      return setCorsHeaders(response);
    }
    
    const response = NextResponse.json({ success: true, data });
    return setCorsHeaders(response);
    
  } catch (error) {
    const response = NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
    return setCorsHeaders(response);
  }
}
