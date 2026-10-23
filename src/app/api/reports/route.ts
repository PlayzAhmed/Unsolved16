import { createHash, randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { requireFirebaseUser } from '@/lib/firebase/server-auth';

const MAX_PDF_BYTES = 650 * 1024;
const MAX_PDF_BASE64_CHARS = 900_000;
const REPORT_ID_PATTERN = /^ET-\d{4}-[A-F0-9]{12}$/;

function createReportId(): string {
  return `ET-${new Date().getFullYear()}-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}

function isReportInput(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  return typeof body.address === 'string' && body.address.trim().length > 0 && body.address.length <= 300 && typeof body.monthlySpendEgp === 'number' && Number.isFinite(body.monthlySpendEgp) && typeof body.monthlyKwh === 'number' && Number.isFinite(body.monthlyKwh) && typeof body.transitionRatio === 'number' && body.transitionRatio >= 0.5 && body.transitionRatio <= 1;
}

export async function POST(request: NextRequest) {
  let user: Awaited<ReturnType<typeof requireFirebaseUser>>;
  try {
    user = await requireFirebaseUser(request);
  } catch (error) {
    console.error('Unable to verify report request:', error);
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const contentType = request.headers.get('content-type') ?? '';
    const reports = adminDb().collection('users').doc(user.uid).collection('reports');

    if (contentType.includes('application/json')) {
      const input: unknown = await request.json();
      if (!isReportInput(input)) return NextResponse.json({ error: 'Invalid report payload.' }, { status: 400 });

      const { reportId: requestedReportId, ...reportInput } = input;
      if (requestedReportId !== undefined && (typeof requestedReportId !== 'string' || !REPORT_ID_PATTERN.test(requestedReportId))) {
        return NextResponse.json({ error: 'Invalid report ID.' }, { status: 400 });
      }

      const reportId = requestedReportId ?? createReportId();
      const reportRef = reports.doc(reportId);

      const result = await adminDb().runTransaction(async (transaction) => {
        const existing = await transaction.get(reportRef);
        if (existing.exists) {
          const data = existing.data();
          if (data?.ownerUid !== user.uid) throw new Error('Report ID ownership mismatch.');
          return { status: typeof data?.status === 'string' ? data.status : 'authorized', existed: true };
        }

        transaction.create(reportRef, {
          reportId,
          ownerUid: user.uid,
          input: reportInput,
          status: 'authorized',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { status: 'authorized', existed: false };
      });

      return NextResponse.json({ reportId, status: result.status }, { status: result.existed ? 200 : 201 });
    }

    if (!contentType.includes('multipart/form-data')) return NextResponse.json({ error: 'Unsupported request type.' }, { status: 415 });
    const form = await request.formData();
    const reportId = form.get('reportId');
    const pdf = form.get('pdf');
    if (typeof reportId !== 'string' || !REPORT_ID_PATTERN.test(reportId) || !(pdf instanceof File) || pdf.size === 0 || pdf.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Invalid PDF upload.' }, { status: 400 });
    }
    if (pdf.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'Report exceeds the free archive size limit.' }, { status: 413 });
    }

    const reportRef = reports.doc(reportId);
    const report = await reportRef.get();
    const reportStatus = report.data()?.status;
    if (!report.exists || (reportStatus !== 'authorized' && reportStatus !== 'issued')) {
      return NextResponse.json({ error: 'Report is not authorized for upload.' }, { status: 403 });
    }
    const bytes = Buffer.from(await pdf.arrayBuffer());
    if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') return NextResponse.json({ error: 'Uploaded file is not a PDF.' }, { status: 400 });
    const pdfBase64 = bytes.toString('base64');
    if (pdfBase64.length > MAX_PDF_BASE64_CHARS) {
      return NextResponse.json({ error: 'Report exceeds the free archive size limit.' }, { status: 413 });
    }

    await reportRef.update({
      status: 'issued',
      pdfBase64,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      sizeBytes: bytes.length,
      contentType: 'application/pdf',
      issuedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ reportId, status: 'issued' });
  } catch (error) {
    console.error('Unable to authorize or store report:', error);
    return NextResponse.json({ error: 'Unable to store report.' }, { status: 500 });
  }
}
