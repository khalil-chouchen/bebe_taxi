import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/middleware/auth';
import ClientProfile from '@/models/ClientProfile';
import { connectDB } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'client');
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const { latitude, longitude } = body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json({ error: 'latitude and longitude required' }, { status: 400 });
    }

    await connectDB();
    await ClientProfile.findOneAndUpdate(
      { userId: auth.user._id },
      { currentLocation: { type: 'Point', coordinates: [longitude, latitude] } },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[client/location]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
