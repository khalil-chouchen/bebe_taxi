import axios from 'axios';

const DEV_MODE = process.env.DEV_MODE === 'true';
const DEV_OTP = '123456';

// ─── Meta WhatsApp Cloud API ───────────────────────────────────────────────────

async function sendViaMeta(phone: string, code: string): Promise<void> {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.META_WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    throw new Error('META_WHATSAPP_TOKEN and META_WHATSAPP_PHONE_ID must be set');
  }

  // Normalize phone: remove all non-digits, ensure international format
  const normalized = phone.replace(/\D/g, '');

  await axios.post(
    `https://graph.facebook.com/v20.0/${phoneId}/messages`,
    {
      messaging_product: 'whatsapp',
      to: normalized,
      type: 'text',
      text: {
        body: `🚖 Bebe Taxi — Your verification code is: *${code}*\n\nThis code expires in 10 minutes.`,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

// ─── Twilio WhatsApp ───────────────────────────────────────────────────────────

async function sendViaTwilio(phone: string, code: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  if (!accountSid || !authToken) {
    throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set');
  }

  const normalized = phone.replace(/\D/g, '');
  const to = `whatsapp:+${normalized}`;
  const body = `🚖 Bebe Taxi — Your verification code is: ${code}\n\nThis code expires in 10 minutes.`;

  await axios.post(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    new URLSearchParams({ From: from, To: to, Body: body }).toString(),
    {
      auth: { username: accountSid, password: authToken },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function sendWhatsAppOtp(phone: string, code: string): Promise<void> {
  if (DEV_MODE) {
    console.log(`[DEV OTP] Phone: ${phone} — Code: ${code} (use ${DEV_OTP} in dev)`);
    return;
  }

  const provider = process.env.WHATSAPP_PROVIDER || 'meta';

  if (provider === 'twilio') {
    await sendViaTwilio(phone, code);
  } else {
    await sendViaMeta(phone, code);
  }
}

export function generateOtpCode(): string {
  if (DEV_MODE) return DEV_OTP;
  // 6-digit random code
  return Math.floor(100000 + Math.random() * 900000).toString();
}
