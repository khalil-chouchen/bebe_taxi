import { NextRequest, NextResponse } from 'next/server';
import { reverseGeocode } from '@/services/maps';

export async function GET(request: NextRequest) {
  const latitude = Number(request.nextUrl.searchParams.get('lat'));
  const longitude = Number(request.nextUrl.searchParams.get('lng'));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  try {
    const result = await reverseGeocode(latitude, longitude);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[maps/reverse-geocode]', error);
    return NextResponse.json({
      latitude,
      longitude,
      formattedAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      provider: 'fallback',
    });
  }
}