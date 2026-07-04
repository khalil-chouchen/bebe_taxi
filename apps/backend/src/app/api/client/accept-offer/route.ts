import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/middleware/auth';
import TaxiOffer from '@/models/TaxiOffer';
import TaxiRequest from '@/models/TaxiRequest';
import TaxiProfile from '@/models/TaxiProfile';
import ClientProfile from '@/models/ClientProfile';
import Trip from '@/models/Trip';
import User from '@/models/User';
import { connectDB } from '@/lib/mongodb';
import { SOCKET_EVENTS } from '@bebe-taxi/shared/constants';

// REST fallback for offer acceptance — used when socket is not connected.
// Performs the same atomic logic as the socket handler (client:acceptOffer).
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'client');
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const { offerId, requestId } = body;

    if (!offerId || !requestId) {
      return NextResponse.json({ error: 'offerId and requestId required' }, { status: 400 });
    }

    await connectDB();

    // 1. Atomically mark request as accepted (only if still searching)
    const taxiRequest = await TaxiRequest.findOneAndUpdate(
      { _id: requestId, clientId: auth.user._id, status: 'searching' },
      { status: 'accepted' },
      { new: true }
    );

    if (!taxiRequest) {
      return NextResponse.json(
        { error: 'Request not found or no longer available' },
        { status: 409 }
      );
    }

    // 2. Accept the chosen offer (only if still pending)
    const acceptedOffer = await TaxiOffer.findOneAndUpdate(
      { _id: offerId, requestId, status: 'pending' },
      { status: 'accepted' },
      { new: true }
    );

    if (!acceptedOffer) {
      // Rollback request status
      await TaxiRequest.findByIdAndUpdate(requestId, { status: 'searching' });
      return NextResponse.json({ error: 'Offer no longer available' }, { status: 409 });
    }

    // 3. Reject all other pending offers for this request
    await TaxiOffer.updateMany(
      { requestId, _id: { $ne: offerId }, status: 'pending' },
      { status: 'rejected' }
    );

    // 4. Mark accepted taxi as unavailable
    await TaxiProfile.findOneAndUpdate(
      { userId: acceptedOffer.taxiId },
      { isAvailable: false }
    );

    // 5. Get location data for trip creation
    const clientProfile = await ClientProfile.findOne({ userId: auth.user._id });
    const taxiProfile = await TaxiProfile.findOne({ userId: acceptedOffer.taxiId });

    if (!clientProfile || !taxiProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 500 });
    }

    // 6. Create trip
    const trip = await Trip.create({
      requestId,
      clientId: auth.user._id,
      taxiId: acceptedOffer.taxiId,
      startLocation: clientProfile.currentLocation,
      taxiStartLocation: taxiProfile.currentLocation,
      status: 'accepted',
      acceptedAt: new Date(),
    });

    // 7. Update request with accepted taxi ID
    await TaxiRequest.findByIdAndUpdate(requestId, {
      acceptedTaxiId: acceptedOffer.taxiId,
    });

    // 8. Notify via Socket.IO if server-side io is available
    if (global.io) {
      const taxiUser = await User.findById(acceptedOffer.taxiId);

      // Notify accepted taxi
      global.io.to(`user:${acceptedOffer.taxiId.toString()}`).emit(SOCKET_EVENTS.OFFER_ACCEPTED, {
        trip: {
          _id: trip._id,
          clientId: auth.user._id.toString(),
          clientLocation: clientProfile.currentLocation,
        },
        message: 'Le client a accepté votre offre !',
      });

      // Notify rejected taxis
      const rejectedOffers = await TaxiOffer.find({
        requestId,
        status: 'rejected',
        _id: { $ne: offerId },
      });
      for (const rej of rejectedOffers) {
        global.io.to(`user:${rej.taxiId.toString()}`).emit(SOCKET_EVENTS.OFFER_REJECTED, {
          requestId,
          message: 'Le client a choisi un autre taxi',
        });
      }

      // Remove request from all taxi screens
      global.io.emit(SOCKET_EVENTS.REQUEST_CANCELLED, { requestId });

      // Confirm trip start to client's room (for any other device sessions)
      global.io.to(`user:${auth.user._id.toString()}`).emit(SOCKET_EVENTS.TRIP_STARTED, {
        trip: {
          _id: trip._id,
          requestId,
          taxiId: acceptedOffer.taxiId,
          taxiLocation: taxiProfile.currentLocation,
        },
        taxi: {
          fullName: taxiUser?.fullName,
          phone: taxiUser?.phone,
          avatarUrl: taxiUser?.avatarUrl,
          taxiNumber: taxiProfile.taxiNumber,
          matricule: taxiProfile.matricule,
        },
      });
    }

    return NextResponse.json({ trip }, { status: 201 });
  } catch (error: any) {
    console.error('[client/accept-offer]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
