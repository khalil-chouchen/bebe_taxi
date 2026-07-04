import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/middleware/auth';
import Trip from '@/models/Trip';
import TaxiProfile from '@/models/TaxiProfile';
import User from '@/models/User';
import { connectDB } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();

    const query =
      auth.user.role === 'client'
        ? { clientId: auth.user._id, status: { $in: ['accepted', 'arriving', 'arrived'] } }
        : { taxiId: auth.user._id, status: { $in: ['accepted', 'arriving', 'arrived'] } };

    const trip = await Trip.findOne(query).lean();

    if (!trip) {
      return NextResponse.json({ trip: null });
    }

    // Enrich with user info
    let otherParty: any = null;

    if (auth.user.role === 'client') {
      const taxiUser = await User.findById(trip.taxiId).lean();
      const taxiProfile = await TaxiProfile.findOne({ userId: trip.taxiId }).lean();
      const [taxiLng, taxiLat] = taxiProfile?.currentLocation?.coordinates ?? [0, 0];
      otherParty = {
        userId: trip.taxiId,
        fullName: taxiUser?.fullName,
        phone: taxiUser?.phone,
        avatarUrl: taxiUser?.avatarUrl,
        taxiNumber: taxiProfile?.taxiNumber,
        matricule: taxiProfile?.matricule,
        latitude: taxiLat,
        longitude: taxiLng,
      };
    } else {
      const clientUser = await User.findById(trip.clientId).lean();
      const [clientLng, clientLat] = trip.startLocation?.coordinates ?? [0, 0];
      otherParty = {
        userId: trip.clientId,
        fullName: clientUser?.fullName,
        phone: clientUser?.phone,
        latitude: clientLat,
        longitude: clientLng,
      };
    }

    return NextResponse.json({ trip, otherParty });
  } catch (error) {
    console.error('[trip/current]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
