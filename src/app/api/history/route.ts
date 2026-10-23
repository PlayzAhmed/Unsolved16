import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { requireFirebaseUser } from '@/lib/firebase/server-auth';

interface CalculationInput {
  address: string;
  monthlySpendEgp: number;
  monthlyKwh: number;
  transitionRatio: number;
  meterNumber?: string;
  roofAreaM2: number;
  usableAreaM2: number;
  latitude: number;
  longitude: number;
}

interface CalculationResult {
  systemCapacityKwp: number;
  initialCostEgp: number;
  annualSavingsEgp: number;
  paybackPeriodYears: number;
  greenScore: number;
  co2ReductionTons: number;
}

function isNumber(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function readPayload(value: unknown): { input: CalculationInput; result: CalculationResult } | null {
  if (!value || typeof value !== 'object') return null;
  const body = value as Record<string, unknown>;
  const input = body.input as Record<string, unknown> | undefined;
  const result = body.result as Record<string, unknown> | undefined;
  if (!input || !result || typeof input.address !== 'string' || input.address.length > 300 || input.address.trim().length === 0) return null;
  if (input.meterNumber !== undefined && (typeof input.meterNumber !== 'string' || input.meterNumber.length > 100)) return null;
  if (!isNumber(input.monthlySpendEgp, 0, 10_000_000) || !isNumber(input.monthlyKwh, 0, 10_000_000) || !isNumber(input.transitionRatio, 0.5, 1) || !isNumber(input.roofAreaM2, 0, 1_000_000) || !isNumber(input.usableAreaM2, 0, 1_000_000) || !isNumber(input.latitude, -90, 90) || !isNumber(input.longitude, -180, 180)) return null;
  if (!isNumber(result.systemCapacityKwp, 0, 100_000) || !isNumber(result.initialCostEgp, 0, 1_000_000_000) || !isNumber(result.annualSavingsEgp, 0, 1_000_000_000) || !isNumber(result.paybackPeriodYears, 0, 100) || !isNumber(result.greenScore, 0, 100) || !isNumber(result.co2ReductionTons, 0, 1_000_000)) return null;
  return { input: input as unknown as CalculationInput, result: result as unknown as CalculationResult };
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireFirebaseUser(request);
    const payload = readPayload(await request.json());
    if (!payload) return NextResponse.json({ error: 'Invalid calculation payload.' }, { status: 400 });

    const ref = adminDb().collection('users').doc(user.uid).collection('calculations').doc();
    await ref.set({ ...payload, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ id: ref.id }, { status: 201 });
  } catch (error) {
    console.error('Unable to save calculation history:', error);
    return NextResponse.json({ error: 'Unauthorized or unable to save history.' }, { status: 401 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireFirebaseUser(request);
    const snapshot = await adminDb().collection('users').doc(user.uid).collection('calculations').orderBy('createdAt', 'desc').limit(50).get();
    return NextResponse.json({ calculations: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
  } catch (error) {
    console.error('Unable to read calculation history:', error);
    return NextResponse.json({ error: 'Unauthorized or unable to read history.' }, { status: 401 });
  }
}
