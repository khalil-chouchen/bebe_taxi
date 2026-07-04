import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, JwtPayload } from '@/lib/jwt';
import { connectDB } from '@/lib/mongodb';
import User, { IUser } from '@/models/User';

export interface AuthenticatedRequest extends NextRequest {
  user?: IUser;
  jwtPayload?: JwtPayload;
}

export async function getAuthUser(
  request: NextRequest
): Promise<{ user: IUser; payload: JwtPayload } | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    await connectDB();
    const user = await User.findById(payload.userId);
    if (!user) return null;

    return { user, payload };
  } catch {
    return null;
  }
}

export async function requireAuth(
  request: NextRequest,
  role?: 'client' | 'taxi'
): Promise<{ user: IUser; payload: JwtPayload } | NextResponse> {
  const auth = await getAuthUser(request);

  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (role && auth.user.role !== role) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return auth;
}

export function isAuthError(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
