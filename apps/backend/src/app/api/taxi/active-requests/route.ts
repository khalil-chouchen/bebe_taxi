import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/middleware/auth';
import TaxiRequest from '@/models/TaxiRequest';
import User from '@/models/User';
import { connectDB } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'taxi');
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();

    const requests = await TaxiRequest.find({
      status: 'searching',
      expiresAt: { $gt: new Date() },
    }).lean();

    const clientIds = requests.map((r) => r.clientId);
    const clients = await User.find({ _id: { $in: clientIds } }).lean();
    const clientMap = new Map(clients.map((c) => [c._id.toString(), c]));

    const result = requests.map((r) => {
      const client = clientMap.get(r.clientId.toString());
      const [lng, lat] = r.clientLocation?.coordinates ?? [0, 0];
      const [destinationLng, destinationLat] = r.destinationLocation?.coordinates ?? [];
      return {
        requestId: r._id,
        clientId: r.clientId,
        clientName: client?.fullName || 'Client',
        latitude: lat,
        longitude: lng,
        destinationLocation:
          typeof destinationLat === 'number' && typeof destinationLng === 'number'
            ? { latitude: destinationLat, longitude: destinationLng }
            : undefined,
        expiresAt: r.expiresAt,
        createdAt: r.createdAt,
      };
    });

    return NextResponse.json({ requests: result });
  } catch (error) {
    console.error('[taxi/active-requests]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
