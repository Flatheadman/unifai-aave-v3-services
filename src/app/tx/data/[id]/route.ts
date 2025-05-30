// app/api/transaction/[id]/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { getTransaction } from '../../../../lib/storage';

// export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
//   try {
//     const data = await getTransaction(params.id);
//     if (!data) {
//       return NextResponse.json({ error: 'Transaction not found or expired' }, { status: 404 });
//     }
//     return NextResponse.json({ success: true, data });
//   } catch (error) {
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
//   }
// }


import { NextRequest, NextResponse } from 'next/server';
import { getTransaction } from '../../../../lib/storage';

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getTransaction(id);
    if (!data) {
      return NextResponse.json({ error: 'Transaction not found or expired' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}