/**
 * Create YooKassa payment for a booking (client-side helper)
 */
export async function createYooKassaPayment(
  bookingId: string,
  accessToken: string,
): Promise<{ confirmationUrl: string; paymentId: string }> {
  const res = await fetch('/api/payments/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ bookingId }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Не удалось создать платёж');
  }
  return { confirmationUrl: data.confirmationUrl, paymentId: data.paymentId };
}
