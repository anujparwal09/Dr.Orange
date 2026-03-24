import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://dr-orange.onrender.com';
    const authHeader = request.headers.get('authorization') || '';

    const response = await fetch(`${apiUrl}/api/chat/conversations`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({ error: errorData.error || 'Conversations fetch failed' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Conversations API error:', error);
    return NextResponse.json({ error: 'Conversations service unavailable' }, { status: 500 });
  }
}
