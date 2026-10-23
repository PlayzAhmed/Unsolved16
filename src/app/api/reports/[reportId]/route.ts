import { NextRequest, NextResponse } from 'next/server';
import { adminBucket, adminDb } from '@/lib/firebase/admin';
import { requireFirebaseUser } from '@/lib/firebase/server-auth';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ reportId: string }>;
}

/** Streams an issued report only to the Firebase account that owns its ID. */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireFirebaseUser(request);
    const { reportId } = await context.params;
    if (!/^ET-\d{4}-[A-F0-9]{12}$/.test(reportId)) {
      return NextResponse.json({ error: 'Invalid report ID.' }, { status: 400 });
    }

    const report = await adminDb().collection('users').doc(user.uid).collection('reports').doc(reportId).get();
    const data = report.data();
    if (!report.exists || data?.ownerUid !== user.uid || data.status !== 'issued' || typeof data.storagePath !== 'string') {
      return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
    }

    const [pdf] = await adminBucket().file(data.storagePath).download();
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
    return NextResponse.json({ error: 'Unauthorized or unable to retrieve report.' }, { status: 401 });
  }
}
