import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { signToken } from '@/lib/jwt';
import User from '@/models/User';
import ClientProfile from '@/models/ClientProfile';
import OtpCode from '@/models/OtpCode';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, phone, email, password } = body;

    if (!fullName || !phone || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify phone OTP was completed
    const otp = await OtpCode.findOne({ phone: phone.trim(), verified: true });
    if (!otp) {
      return NextResponse.json(
        { error: 'Phone not verified. Please verify your OTP first.' },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({
      $or: [{ phone: phone.trim() }, { email: email.toLowerCase().trim() }],
    });

    if (existingUser) {
      const field = existingUser.phone === phone.trim() ? 'phone' : 'email';
      return NextResponse.json(
        { error: `An account with this ${field} already exists` },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      role: 'client',
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      isPhoneVerified: true,
    });

    await ClientProfile.create({
      userId: user._id,
      currentLocation: { type: 'Point', coordinates: [0, 0] },
    });

    // Clean up used OTP
    await OtpCode.deleteMany({ phone: phone.trim() });

    const token = signToken({ userId: user._id.toString(), role: 'client' });

    return NextResponse.json(
      {
        token,
        user: {
          _id: user._id,
          role: user.role,
          fullName: user.fullName,
          phone: user.phone,
          email: user.email,
          isPhoneVerified: user.isPhoneVerified,
          createdAt: user.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[register-client]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
