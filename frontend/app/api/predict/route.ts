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

    // Get response text first to handle non-JSON responses
    const responseText = await response.text();
    console.log('[PREDICT] Raw response:', response.status, responseText?.substring(0, 200));

    if (!response.ok) {
      // Try to parse as JSON, fallback to plain text
      let errorData: any = { error: `Backend error ${response.status}` };
      try {
        if (responseText) {
          errorData = JSON.parse(responseText);
        }
      } catch (e) {
        // If not JSON, use the text as error message
        errorData = { error: responseText || `Backend error ${response.status}` };
      }

      console.error('[PREDICT] Backend error:', response.status, errorData);
      
      const errorMessage = errorData?.error || `Backend returned ${response.status}`;
      return NextResponse.json(
        { error: errorMessage, code: errorData?.code },
        { status: response.status }
      );
    }

    // Parse successful response
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[PREDICT] Cannot parse success response:', e);
      return NextResponse.json(
        { error: 'Invalid response format from backend' },
        { status: 502 }
      );
    }

    console.log('[PREDICT] Success:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[PREDICT] Network error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Cannot reach prediction service: ${errorMsg}` },
      { status: 503 }
    );
  }
}
