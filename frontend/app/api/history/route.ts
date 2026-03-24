import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://dr-orange.onrender.com';
    const token = request.headers.get('Authorization') || '';

    const response = await fetch(`${apiUrl}/api/history`, {
      method: 'GET',
      headers: {
        Authorization: token,
      },
    });

    if (!response.ok) {
      throw new Error(`Flask API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('History API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
