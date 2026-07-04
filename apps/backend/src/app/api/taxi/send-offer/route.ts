import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/middleware/auth';
import TaxiOffer from '@/models/TaxiOffer';
import TaxiRequest from '@/models/TaxiRequest';
import TaxiProfile from '@/models/TaxiProfile';
import { connectDB } from '@/lib/mongodb';
import { haversineDistanceKm, estimateEtaMinutes } from '@/utils/haversine';
import { SOCKET_EVENTS } from '@bebe-taxi/shared/constants';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'taxi');
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
    }

    await connectDB();

    const taxiRequest = await TaxiRequest.findOne({
      _id: requestId,
      status: 'searching',
      expiresAt: { $gt: new Date() },
    });

    if (!taxiRequest) {
      return NextResponse.json({ error: 'Request not available' }, { status: 404 });
    }

    const taxiProfile = await TaxiProfile.findOne({ userId: auth.user._id });
    if (!taxiProfile) {
      return NextResponse.json({ error: 'Taxi profile not found' }, { status: 404 });
    }

    const [clientLng, clientLat] = taxiRequest.clientLocation.coordinates;
    const [taxiLng, taxiLat] = taxiProfile.currentLocation.coordinates;
    const distanceKm = haversineDistanceKm(taxiLat, taxiLng, clientLat, clientLng);
    const etaMinutes = estimateEtaMinutes(distanceKm);

    const offer = await TaxiOffer.findOneAndUpdate(
      { requestId, taxiId: auth.user._id },
      { distanceKm, etaMinutes, status: 'pending' },
      { upsert: true, new: true }
    );

    // Notify client via socket
    if (global.io) {
      global.io.to(`user:${taxiRequest.clientId.toString()}`).emit(SOCKET_EVENTS.OFFER_NEW, {
        offer: {
          _id: offer._id,
          requestId: offer.requestId,
          taxiId: offer.taxiId,
          distanceKm: offer.distanceKm,
          etaMinutes: offer.etaMinutes,
          status: offer.status,
        },
        taxi: {
          userId: auth.user._id,
          fullName: auth.user.fullName,
          phone: auth.user.phone,
          avatarUrl: auth.user.avatarUrl,
          taxiNumber: taxiProfile.taxiNumber,
          matricule: taxiProfile.matricule,
          averageRating: taxiProfile.averageRating,
        },
      });
    }

    return NextResponse.json({ offer });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Offer already sent' }, { status: 409 });
    }
    console.error('[taxi/send-offer]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
