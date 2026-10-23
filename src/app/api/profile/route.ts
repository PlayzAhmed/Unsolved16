import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { requireFirebaseUser } from '@/lib/firebase/server-auth';

function readString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireFirebaseUser(request);
    const body: unknown = await request.json().catch(() => null);
    const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};

    // The verified token is the source of truth for identity data. The client
    // display name is only used when Firebase has not stored one yet.
    const email = readString(user.email, 320);
    const displayName =
      readString(payload.displayName, 120) ||
      readString(user.name, 120) ||
      email.split('@')[0] ||
      '';

    const ref = adminDb().collection('users').doc(user.uid);
    const existing = await ref.get();

    await ref.set(
      {
        uid: user.uid,
        email,
        displayName,
        ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Unable to save the account profile:', error);
    return NextResponse.json(
      { error: 'Unauthorized or unable to save the account profile.' },
      { status: 401 }
    );
  }
}
