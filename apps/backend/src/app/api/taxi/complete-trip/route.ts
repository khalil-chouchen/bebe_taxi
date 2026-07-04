import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/middleware/auth';
import Trip from '@/models/Trip';
import TaxiProfile from '@/models/TaxiProfile';
import TaxiRequest from '@/models/TaxiRequest';
import { connectDB } from '@/lib/mongodb';
import { SOCKET_EVENTS } from '@bebe-taxi/shared/constants';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'taxi');
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();

    const trip = await Trip.findOneAndUpdate(
      {
        taxiId: auth.user._id,
        status: { $in: ['arrived', 'arriving'] },
      },
      { status: 'completed', completedAt: new Date() },
      { new: true }
    );

    if (!trip) {
      return NextResponse.json({ error: 'No active trip to complete' }, { status: 404 });
    }

    // Make taxi available again
    await TaxiProfile.findOneAndUpdate({ userId: auth.user._id }, { isAvailable: true });
    await TaxiRequest.findByIdAndUpdate(trip.requestId, { status: 'completed' });

    // Notify client
    if (global.io) {
      global.io.to(`user:${trip.clientId.toString()}`).emit(SOCKET_EVENTS.TRIP_COMPLETED, {
        tripId: trip._id,
      });
    }

    return NextResponse.json({ success: true, trip });
  } catch (error) {
    console.error('[taxi/complete-trip]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
