import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/middleware/auth';
import TaxiProfile from '@/models/TaxiProfile';
import { connectDB } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'taxi');
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const { latitude, longitude } = body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json({ error: 'latitude and longitude required' }, { status: 400 });
    }

    await connectDB();
    await TaxiProfile.findOneAndUpdate(
      { userId: auth.user._id },
      { currentLocation: { type: 'Point', coordinates: [longitude, latitude] } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[taxi/location]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
