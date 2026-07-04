import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/middleware/auth';
import TaxiProfile from '@/models/TaxiProfile';
import { connectDB } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'taxi');
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const { isOnline } = body;

    await connectDB();
    await TaxiProfile.findOneAndUpdate(
      { userId: auth.user._id },
      { isOnline: !!isOnline, isAvailable: !!isOnline }
    );

    return NextResponse.json({ success: true, isOnline: !!isOnline });
  } catch (error) {
    console.error('[taxi/online]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
