import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { conversationId: string } }) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://dr-orange.onrender.com';
    const authHeader = request.headers.get('authorization') || '';

    const response = await fetch(`${apiUrl}/api/chat/${params.conversationId}`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({ error: errorData.error || 'Conversation fetch failed' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Conversation GET API error:', error);
    return NextResponse.json({ error: 'Conversation service unavailable' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { conversationId: string } }) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://dr-orange.onrender.com';
    const authHeader = request.headers.get('authorization') || '';
    const formData = await request.formData();

    const backendFormData = new FormData();
    formData.forEach((value, key) => {
      backendFormData.append(key, value);
    });

    const response = await fetch(`${apiUrl}/api/chat/${params.conversationId}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
      },
      body: backendFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({ error: errorData.error || 'Conversation post failed' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Conversation POST API error:', error);
    return NextResponse.json({ error: 'Conversation service unavailable' }, { status: 500 });
  }
}
