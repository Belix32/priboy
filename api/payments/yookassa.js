const YOOKASSA_API = 'https://api.yookassa.ru/v3';

/** Official YooKassa notification source IPs (subset; verify via API is primary). */
const YOOKASSA_IP_PREFIXES = [
  '185.71.76.',
  '185.71.77.',
  '77.75.153.',
  '77.75.156.',
  '2a02:5180:',
];

export function getYooKassaCredentials() {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secretKey) return null;
  return { shopId, secretKey };
}

export function isYooKassaIp(ip) {
  if (!ip) return false;
  const normalized = ip.replace(/^::ffff:/, '');
  return YOOKASSA_IP_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '';
}

export async function fetchYooKassaPayment(paymentId) {
  const creds = getYooKassaCredentials();
  if (!creds) throw new Error('YooKassa not configured');

  const res = await fetch(`${YOOKASSA_API}/payments/${paymentId}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${creds.shopId}:${creds.secretKey}`).toString('base64')}`,
    },
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.description || 'Failed to verify payment with YooKassa');
  }
  return body;
}
