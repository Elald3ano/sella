import QRCode from 'qrcode';

const DEFAULT_BASE_URL = process.env.NODE_ENV === 'production' ? 'https://sella.co' : 'http://localhost:5174';

export async function generateBusinessQR(businessId: string, baseUrl?: string): Promise<{ qr: string; url: string }> {
  const url = `${baseUrl || DEFAULT_BASE_URL}/s/${businessId}`;
  const qr = await QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: { dark: '#4338ca', light: '#ffffff' },
  });
  return { qr, url };
}

export function getBusinessQRUrl(businessId: string, baseUrl?: string): string {
  return `${baseUrl || DEFAULT_BASE_URL}/s/${businessId}`;
}
