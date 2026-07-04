import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/middleware/auth';
import TaxiOffer from '@/models/TaxiOffer';
import TaxiRequest from '@/models/TaxiRequest';
import TaxiProfile from '@/models/TaxiProfile';
import User from '@/models/User';
import { connectDB } from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  const auth = await requireAuth(request, 'client');
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();

    const taxiRequest = await TaxiRequest.findOne({
      _id: params.requestId,
      clientId: auth.user._id,
    });

    if (!taxiRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const offers = await TaxiOffer.find({
      requestId: params.requestId,
      status: 'pending',
    }).lean();

    const taxiIds = offers.map((o) => o.taxiId);
    const [users, profiles] = await Promise.all([
      User.find({ _id: { $in: taxiIds } }).lean(),
      TaxiProfile.find({ userId: { $in: taxiIds } }).lean(),
    ]);

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

    const enriched = offers.map((offer) => {
      const taxi = userMap.get(offer.taxiId.toString());
      const profile = profileMap.get(offer.taxiId.toString());
      return {
        _id: offer._id,
        requestId: offer.requestId,
        taxiId: offer.taxiId,
        distanceKm: offer.distanceKm,
        etaMinutes: offer.etaMinutes,
        status: offer.status,
        createdAt: offer.createdAt,
        taxi: {
          fullName: taxi?.fullName,
          phone: taxi?.phone,
          avatarUrl: taxi?.avatarUrl,
          taxiNumber: profile?.taxiNumber,
          matricule: profile?.matricule,
          averageRating: profile?.averageRating,
          totalReviews: profile?.totalReviews,
        },
      };
    });

    return NextResponse.json({ offers: enriched });
  } catch (error) {
    console.error('[client/offers]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
