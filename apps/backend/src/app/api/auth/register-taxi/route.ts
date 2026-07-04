import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { connectDB } from '@/lib/mongodb';
import { signToken } from '@/lib/jwt';
import User from '@/models/User';
import TaxiProfile from '@/models/TaxiProfile';
import OtpCode from '@/models/OtpCode';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, phone, email, password, taxiNumber, matricule, avatarBase64 } = body;

    if (!fullName || !phone || !email || !password || !taxiNumber || !matricule) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify OTP
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

    // Save avatar image if provided
    let avatarUrl: string | undefined;
    if (avatarBase64) {
      try {
        const matches = avatarBase64.match(/^data:image\/(\w+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1];
          const base64Data = matches[2];
          const fileName = `taxi_${Date.now()}.${ext}`;
          const uploadDir = path.join(process.cwd(), 'public', 'uploads');
          fs.mkdirSync(uploadDir, { recursive: true });
          fs.writeFileSync(path.join(uploadDir, fileName), base64Data, 'base64');
          avatarUrl = `/uploads/${fileName}`;
        }
      } catch {
        // Non-fatal: proceed without avatar
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      role: 'taxi',
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      isPhoneVerified: true,
      avatarUrl,
    });

    await TaxiProfile.create({
      userId: user._id,
      taxiNumber: taxiNumber.trim(),
      matricule: matricule.trim(),
      currentLocation: { type: 'Point', coordinates: [0, 0] },
      isOnline: false,
      isAvailable: false,
    });

    await OtpCode.deleteMany({ phone: phone.trim() });

    const token = signToken({ userId: user._id.toString(), role: 'taxi' });

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
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[register-taxi]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
