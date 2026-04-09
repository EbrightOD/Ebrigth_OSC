import { NextResponse } from 'next/server';
import { sendClockInEmail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

// Quick smoke-test: GET /api/test-email
// Sends a test clock-in email to faiqsoudagar1@gmail.com
export async function GET() {
  try {
    const now = new Date().toLocaleTimeString('en-MY', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
    await sendClockInEmail('faiqsoudagar1@gmail.com', 'FAIQ', now);
    return NextResponse.json({ success: true, message: `Test email sent to faiqsoudagar1@gmail.com at ${now}` });
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
