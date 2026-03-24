import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://dr-orange.onrender.com';
    const authHeader = request.headers.get('authorization') || '';

    console.log('[PREDICT] Calling backend:', apiUrl);
    
    const response = await fetch(`${apiUrl}/api/predict`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
      },
      body: formData,
    });

    // Always try to parse response body for error details
    const data = await response.json();

    if (!response.ok) {
      console.error('[PREDICT] Backend error:', response.status, data);
      
      // Pass through backend error message if available
      const errorMessage = data?.error || `Backend returned ${response.status}`;
      return NextResponse.json(
        { error: errorMessage, code: data?.code },
        { status: response.status }
      );
    }

    console.log('[PREDICT] Success:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[PREDICT] Network/parsing error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Prediction service unavailable: ${errorMsg}` },
      { status: 503 }
    );
  }
}
