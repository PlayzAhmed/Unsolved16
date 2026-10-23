import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireFirebaseUser } from '@/lib/firebase/server-auth';

interface RouteContext {
  params: Promise<{ reportId: string }>;
}

const REPORT_ID_PATTERN = /^ET-\d{4}-[A-F0-9]{12}$/;

/** Streams an issued report only to the Firebase account that owns its ID. */
export async function GET(request: NextRequest, context: RouteContext) {
  let user: Awaited<ReturnType<typeof requireFirebaseUser>>;
  try {
    user = await requireFirebaseUser(request);
  } catch (error) {
    console.error('Unable to verify report request:', error);
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { reportId } = await context.params;
    if (!REPORT_ID_PATTERN.test(reportId)) {
      return NextResponse.json({ error: 'Invalid report ID.' }, { status: 400 });
    }

    const report = await adminDb().collection('users').doc(user.uid).collection('reports').doc(reportId).get();
    const data = report.data();
    if (!report.exists || data?.ownerUid !== user.uid || data.status !== 'issued' || typeof data.pdfBase64 !== 'string') {
      return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
    }

    const pdf = Buffer.from(data.pdfBase64, 'base64');
    const body = new Uint8Array(pdf.byteLength);
    body.set(pdf);
    return new NextResponse(body.buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${reportId}.pdf"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Unable to retrieve report:', error);
    return NextResponse.json({ error: 'Unable to retrieve report.' }, { status: 500 });
  }
}
