import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/middleware/auth';
import TaxiProfile from '@/models/TaxiProfile';
import User from '@/models/User';
import { connectDB } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'client');
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();

    const taxis = await TaxiProfile.find({
      isOnline: true,
      isAvailable: true,
    }).lean();

    const taxiIds = taxis.map((t) => t.userId);
    const users = await User.find({ _id: { $in: taxiIds } }).lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const result = taxis.map((t) => {
      const user = userMap.get(t.userId.toString());
      const [lng, lat] = t.currentLocation?.coordinates ?? [0, 0];
      return {
        taxiId: t.userId,
        fullName: user?.fullName || '',
        phone: user?.phone || '',
        avatarUrl: user?.avatarUrl,
        taxiNumber: t.taxiNumber,
        matricule: t.matricule,
        latitude: lat,
        longitude: lng,
        isAvailable: t.isAvailable,
        averageRating: t.averageRating,
      };
    });

    return NextResponse.json({ taxis: result });
  } catch (error) {
    console.error('[available-taxis]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
