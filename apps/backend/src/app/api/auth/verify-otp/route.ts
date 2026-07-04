import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import OtpCode from '@/models/OtpCode';
import { OTP_MAX_ATTEMPTS } from '@bebe-taxi/shared/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code } = body;

    if (!phone || !code) {
      return NextResponse.json({ error: 'Phone and code are required' }, { status: 400 });
    }

    await connectDB();

    const otpDoc = await OtpCode.findOne({
      phone: phone.trim(),
      verified: false,
    }).sort({ createdAt: -1 });

    if (!otpDoc) {
      return NextResponse.json({ error: 'No OTP found for this phone' }, { status: 400 });
    }

    if (otpDoc.expiresAt < new Date()) {
      await otpDoc.deleteOne();
      return NextResponse.json({ error: 'OTP has expired' }, { status: 400 });
    }

    if (otpDoc.attempts >= OTP_MAX_ATTEMPTS) {
      await otpDoc.deleteOne();
      return NextResponse.json(
        { error: 'Too many attempts. Please request a new OTP.' },
        { status: 429 }
      );
    }

    if (otpDoc.code !== code.trim()) {
      await OtpCode.findByIdAndUpdate(otpDoc._id, { $inc: { attempts: 1 } });
      return NextResponse.json({ error: 'Invalid OTP code' }, { status: 400 });
    }

    await OtpCode.findByIdAndUpdate(otpDoc._id, { verified: true });

    return NextResponse.json({ success: true, message: 'Phone verified' });
  } catch (error: any) {
    console.error('[verify-otp]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
