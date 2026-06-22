const OFFLINE_QR_KEY = 'priboi_offline_qr';

export interface OfflineQrPayload {
  bookingId: string;
  qrText: string;
  qrDataUrl: string;
  savedAt: string;
}

export function saveOfflineQr(payload: Omit<OfflineQrPayload, 'savedAt'>): void {
  try {
    const data: OfflineQrPayload = { ...payload, savedAt: new Date().toISOString() };
    localStorage.setItem(OFFLINE_QR_KEY, JSON.stringify(data));
  } catch {
    // Quota or private mode — ignore
  }
}

export function loadOfflineQr(): OfflineQrPayload | null {
  try {
    const raw = localStorage.getItem(OFFLINE_QR_KEY);
    return raw ? (JSON.parse(raw) as OfflineQrPayload) : null;
  } catch {
    return null;
  }
}

export function clearOfflineQr(bookingId?: string): void {
  if (bookingId) {
    const current = loadOfflineQr();
    if (current?.bookingId !== bookingId) return;
  }
  localStorage.removeItem(OFFLINE_QR_KEY);
}
