import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/middleware/auth';
import TaxiProfile from '@/models/TaxiProfile';
import ClientProfile from '@/models/ClientProfile';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { user } = auth;

  let profile = null;
  if (user.role === 'taxi') {
    profile = await TaxiProfile.findOne({ userId: user._id }).lean();
  } else {
    profile = await ClientProfile.findOne({ userId: user._id }).lean();
  }

  return NextResponse.json({
    user: {
      _id: user._id,
      role: user.role,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      isPhoneVerified: user.isPhoneVerified,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
    profile,
  });
}
