import { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export async function requireFirebaseUser(request: NextRequest) {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) throw new Error('Missing authorization token.');
  const token = header.slice(7);
  if (!token) throw new Error('Missing authorization token.');
  return adminAuth().verifyIdToken(token, true);
}
