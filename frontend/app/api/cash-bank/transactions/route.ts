import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authorization token required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';
    const type = searchParams.get('type');

    let url = `${process.env.NEXT_PUBLIC_API_URL || 'http://31.97.111.245:5000'}/api/cash-bank/transactions`;
    const params = new URLSearchParams();
    
    params.append('page', page);
    params.append('limit', limit);
    if (type) params.append('type', type);
    
    url += `?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in cash-bank transactions API:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch cash bank transactions' },
      { status: 500 }
    );
  }
}
