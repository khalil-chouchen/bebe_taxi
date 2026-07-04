import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import OtpCode from '@/models/OtpCode';
import { sendWhatsAppOtp, generateOtpCode } from '@/services/whatsapp';
import { OTP_EXPIRY_MINUTES } from '@bebe-taxi/shared/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const normalized = phone.trim();

    await connectDB();

    // Invalidate any existing OTP for this phone
    await OtpCode.deleteMany({ phone: normalized });

    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await OtpCode.create({ phone: normalized, code, expiresAt });

    await sendWhatsAppOtp(normalized, code);

    return NextResponse.json({
      success: true,
      message: 'OTP sent via WhatsApp',
      // Expose code in dev mode for easy testing
      ...(process.env.DEV_MODE === 'true' && { devCode: code }),
    });
  } catch (error: any) {
    console.error('[send-otp]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send OTP' },
      { status: 500 }
    );
  }
}
