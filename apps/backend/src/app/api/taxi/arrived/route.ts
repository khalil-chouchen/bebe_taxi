import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/middleware/auth';
import Trip from '@/models/Trip';
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
        status: { $in: ['accepted', 'arriving'] },
      },
      { status: 'arrived', arrivedAt: new Date() },
      { new: true }
    );

    if (!trip) {
      return NextResponse.json({ error: 'No active trip found' }, { status: 404 });
    }

    // Notify client
    if (global.io) {
      global.io.to(`user:${trip.clientId.toString()}`).emit(SOCKET_EVENTS.TRIP_ARRIVED, {
        message: 'Votre taxi est arrivé !',
        tripId: trip._id,
      });
    }

    return NextResponse.json({ success: true, trip });
  } catch (error) {
    console.error('[taxi/arrived]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
