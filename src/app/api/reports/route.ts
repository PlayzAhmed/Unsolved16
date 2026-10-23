import { createHash, randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminBucket, adminDb } from '@/lib/firebase/admin';
import { requireFirebaseUser } from '@/lib/firebase/server-auth';

export const runtime = 'nodejs';

const MAX_PDF_BYTES = 10 * 1024 * 1024;

function isReportInput(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  return typeof body.address === 'string' && body.address.trim().length > 0 && body.address.length <= 300 && typeof body.monthlySpendEgp === 'number' && Number.isFinite(body.monthlySpendEgp) && typeof body.monthlyKwh === 'number' && Number.isFinite(body.monthlyKwh) && typeof body.transitionRatio === 'number' && body.transitionRatio >= 0.5 && body.transitionRatio <= 1;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireFirebaseUser(request);
    const contentType = request.headers.get('content-type') ?? '';
    const reports = adminDb().collection('users').doc(user.uid).collection('reports');

    if (contentType.includes('application/json')) {
      const input: unknown = await request.json();
      if (!isReportInput(input)) return NextResponse.json({ error: 'Invalid report payload.' }, { status: 400 });
      const reportId = `ET-${new Date().getFullYear()}-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
      await reports.doc(reportId).create({ reportId, ownerUid: user.uid, input, status: 'authorized', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      return NextResponse.json({ reportId }, { status: 201 });
    }

    if (!contentType.includes('multipart/form-data')) return NextResponse.json({ error: 'Unsupported request type.' }, { status: 415 });
    const form = await request.formData();
    const reportId = form.get('reportId');
    const pdf = form.get('pdf');
    if (typeof reportId !== 'string' || !/^ET-\d{4}-[A-F0-9]{12}$/.test(reportId) || !(pdf instanceof File) || pdf.size === 0 || pdf.size > MAX_PDF_BYTES || pdf.type !== 'application/pdf') return NextResponse.json({ error: 'Invalid PDF upload.' }, { status: 400 });

    const reportRef = reports.doc(reportId);
    const report = await reportRef.get();
    if (!report.exists || report.data()?.status !== 'authorized') return NextResponse.json({ error: 'Report is not authorized for upload.' }, { status: 403 });
    const bytes = Buffer.from(await pdf.arrayBuffer());
    if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') return NextResponse.json({ error: 'Uploaded file is not a PDF.' }, { status: 400 });

    const path = `reports/${user.uid}/${reportId}.pdf`;
    await adminBucket().file(path).save(bytes, { resumable: false, contentType: 'application/pdf', metadata: { cacheControl: 'private, max-age=0, no-transform', metadata: { ownerUid: user.uid, reportId } } });
    await reportRef.update({ status: 'issued', storagePath: path, sha256: createHash('sha256').update(bytes).digest('hex'), sizeBytes: bytes.length, issuedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ reportId, status: 'issued' });
  } catch (error) {
    console.error('Unable to authorize or store report:', error);
    return NextResponse.json({ error: 'Unauthorized or unable to store report.' }, { status: 401 });
  }
}
