import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/middleware/auth';
import TaxiRequest from '@/models/TaxiRequest';
import ClientProfile from '@/models/ClientProfile';
import { connectDB } from '@/lib/mongodb';
import { REQUEST_EXPIRY_MINUTES, SOCKET_EVENTS } from '@bebe-taxi/shared/constants';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'client');
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const pickupLocation = body.pickupLocation as
      | { latitude?: unknown; longitude?: unknown }
      | undefined;
    const destinationLocation = body.destinationLocation as
      | { latitude?: unknown; longitude?: unknown }
      | undefined;

    await connectDB();

    // Check if client already has an active request
    const existing = await TaxiRequest.findOne({
      clientId: auth.user._id,
      status: 'searching',
    });

    if (existing) {
      return NextResponse.json(
        { error: 'You already have an active request', requestId: existing._id },
        { status: 409 }
      );
    }

    const clientProfile = await ClientProfile.findOne({ userId: auth.user._id });
    if (!clientProfile) {
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 });
    }

    const pickupLatitude =
      typeof pickupLocation?.latitude === 'number'
        ? pickupLocation.latitude
        : clientProfile.currentLocation.coordinates[1];
    const pickupLongitude =
      typeof pickupLocation?.longitude === 'number'
        ? pickupLocation.longitude
        : clientProfile.currentLocation.coordinates[0];

    const destinationLatitude =
      typeof destinationLocation?.latitude === 'number' ? destinationLocation.latitude : null;
    const destinationLongitude =
      typeof destinationLocation?.longitude === 'number' ? destinationLocation.longitude : null;

    const expiresAt = new Date(Date.now() + REQUEST_EXPIRY_MINUTES * 60 * 1000);

    const taxiRequest = await TaxiRequest.create({
      clientId: auth.user._id,
      clientLocation: {
        type: 'Point',
        coordinates: [pickupLongitude, pickupLatitude],
      },
      destinationLocation:
        destinationLatitude !== null && destinationLongitude !== null
          ? {
              type: 'Point',
              coordinates: [destinationLongitude, destinationLatitude],
            }
          : undefined,
      status: 'searching',
      expiresAt,
    });

    // Broadcast new request to all connected taxi drivers via Socket.IO
    if (global.io) {
      const [lng, lat] = [pickupLongitude, pickupLatitude];
      global.io.emit(SOCKET_EVENTS.REQUEST_NEW, {
        requestId: taxiRequest._id,
        clientId: auth.user._id,
        clientName: auth.user.fullName,
        latitude: lat,
        longitude: lng,
        destinationLocation:
          destinationLatitude !== null && destinationLongitude !== null
            ? { latitude: destinationLatitude, longitude: destinationLongitude }
            : undefined,
        expiresAt: expiresAt.toISOString(),
      });
    }

    return NextResponse.json({ request: taxiRequest }, { status: 201 });
  } catch (error) {
    console.error('[request-taxi]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
