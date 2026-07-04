import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/middleware/auth';
import Trip from '@/models/Trip';
import TaxiRequest from '@/models/TaxiRequest';
import TaxiProfile from '@/models/TaxiProfile';
import TaxiOffer from '@/models/TaxiOffer';
import { connectDB } from '@/lib/mongodb';
import { SOCKET_EVENTS } from '@bebe-taxi/shared/constants';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const { requestId } = body;

    await connectDB();

    // Cancel searching request (before any trip exists)
    if (requestId) {
      const query =
        auth.user.role === 'client'
          ? { _id: requestId, clientId: auth.user._id, status: 'searching' }
          : null;

      if (query) {
        await TaxiRequest.findOneAndUpdate(query, { status: 'cancelled' });
        await TaxiOffer.updateMany(
          { requestId, status: 'pending' },
          { status: 'expired' }
        );
        if (global.io) {
          global.io.emit(SOCKET_EVENTS.REQUEST_CANCELLED, { requestId });
        }
      }
    }

    // Cancel active trip
    const tripQuery =
      auth.user.role === 'client'
        ? { clientId: auth.user._id, status: { $in: ['accepted', 'arriving'] } }
        : { taxiId: auth.user._id, status: { $in: ['accepted', 'arriving'] } };

    const trip = await Trip.findOneAndUpdate(tripQuery, { status: 'cancelled' }, { new: true });

    if (trip) {
      // Make taxi available again
      await TaxiProfile.findOneAndUpdate({ userId: trip.taxiId }, { isAvailable: true });

      const notifyUserId =
        auth.user.role === 'client' ? trip.taxiId : trip.clientId;

      if (global.io) {
        global.io.to(`user:${notifyUserId.toString()}`).emit(SOCKET_EVENTS.REQUEST_CANCELLED, {
          tripId: trip._id,
          message: 'Le trajet a été annulé',
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[trip/cancel]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
