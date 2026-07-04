import { Linking } from 'react-native';

/**
 * Open WhatsApp to call/message a specific phone number.
 * Falls back to https://wa.me/ if the WhatsApp app is not installed.
 */
export async function openWhatsApp(phone: string, message?: string): Promise<void> {
  // Normalize: strip all non-digit characters, remove leading 0
  const normalized = phone.replace(/\D/g, '').replace(/^0+/, '');

  const encodedMessage = message ? encodeURIComponent(message) : '';
  const appUrl = `whatsapp://send?phone=${normalized}${encodedMessage ? `&text=${encodedMessage}` : ''}`;
  const webUrl = `https://wa.me/${normalized}${encodedMessage ? `?text=${encodedMessage}` : ''}`;

  try {
    const canOpen = await Linking.canOpenURL(appUrl);
    if (canOpen) {
      await Linking.openURL(appUrl);
    } else {
      await Linking.openURL(webUrl);
    }
  } catch {
    // Last resort — open web fallback
    await Linking.openURL(webUrl);
  }
}
