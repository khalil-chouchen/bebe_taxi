import { NextRequest, NextResponse } from 'next/server';
import { getDirections, MapsServiceError } from '@/services/maps';

export async function GET(request: NextRequest) {
  const originLat = Number(request.nextUrl.searchParams.get('originLat'));
  const originLng = Number(request.nextUrl.searchParams.get('originLng'));
  const destLat = Number(request.nextUrl.searchParams.get('destLat'));
  const destLng = Number(request.nextUrl.searchParams.get('destLng'));

  if (
    !Number.isFinite(originLat) ||
    !Number.isFinite(originLng) ||
    !Number.isFinite(destLat) ||
    !Number.isFinite(destLng)
  ) {
    return NextResponse.json(
      { error: 'originLat, originLng, destLat and destLng are required' },
      { status: 400 }
    );
  }

  try {
    const result = await getDirections(originLat, originLng, destLat, destLng);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MapsServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('[maps/directions]', error);
    return NextResponse.json({ error: 'route unavailable' }, { status: 500 });
  }
}