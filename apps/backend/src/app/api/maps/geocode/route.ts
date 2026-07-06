import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress, MapsServiceError } from '@/services/maps';

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')?.trim();

  if (!address) {
    return NextResponse.json({ error: 'address is required' }, { status: 400 });
  }

  try {
    const result = await geocodeAddress(address);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MapsServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('[maps/geocode]', error);
    return NextResponse.json({ error: 'maps provider unavailable' }, { status: 500 });
  }
}