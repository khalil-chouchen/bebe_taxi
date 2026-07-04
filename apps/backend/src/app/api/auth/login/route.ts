import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { signToken } from '@/lib/jwt';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password, role } = body;

    if (!phone || !password || !role) {
      return NextResponse.json(
        { error: 'Phone, password, and role are required' },
        { status: 400 }
      );
    }

    if (!['client', 'taxi'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ phone: phone.trim(), role });

    if (!user) {
      return NextResponse.json({ error: 'Invalid phone or password' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid phone or password' }, { status: 401 });
    }

    const token = signToken({ userId: user._id.toString(), role: user.role });

    return NextResponse.json({
      token,
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
    });
  } catch (error: any) {
    console.error('[login]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
