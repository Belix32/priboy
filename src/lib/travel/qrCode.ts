import QRCode from 'qrcode';
import type { TravelBooking } from './types';

export interface BookingQrClient {
  name: string;
  phone: string;
  email?: string;
}

function formatQrDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Human-readable QR text — displays correctly when scanned or hovered (iOS/macOS).
 * Avoids custom URL schemes like PRIBOI: which trigger "данные не найдены".
 */
export function buildBookingQrText(
  booking: TravelBooking,
  client: BookingQrClient,
): string {
  const rentalCar = booking.car
    ? `${booking.car.brand} ${booking.car.model}`.trim()
    : '—';

  const lines = [
    'ПРИБОЙ — Бронирование',
    `ID: ${booking.id}`,
    `Клиент: ${client.name || '—'}${client.phone ? `, ${client.phone}` : ''}`,
    `Аренда: ${rentalCar}`,
  ];

  if (booking.car?.license_plate) {
    lines.push(`Госномер авто: ${booking.car.license_plate}`);
  }
  if (booking.car?.color) {
    lines.push(`Цвет: ${booking.car.color}`);
  }

  if (booking.has_storage && booking.own_car_license_plate) {
    const ownCar = [booking.own_car_brand, booking.own_car_model].filter(Boolean).join(' ');
    lines.push(`Парковка: ${ownCar} (${booking.own_car_license_plate})`);
  } else {
    lines.push('Парковка: не требуется');
  }

  lines.push(`Направление: ${booking.destination?.name || '—'}`);
  lines.push(`Даты: ${formatQrDate(booking.start_date)} — ${formatQrDate(booking.end_date)}`);
  lines.push(`Сумма: ${booking.total_price.toLocaleString('ru-RU')} ₽`);

  return lines.join('\n');
}

/** Extract booking UUID from QR text or raw input */
export function parseBookingIdFromQrText(text: string): string | null {
  const trimmed = text.trim();
  const idLine = trimmed.split('\n').find((line) => line.startsWith('ID: '));
  if (idLine) return idLine.replace('ID: ', '').trim();

  const uuidMatch = trimmed.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  );
  if (uuidMatch) return uuidMatch[0];

  return trimmed.length >= 8 ? trimmed : null;
}

export async function generateBookingQrDataUrl(text: string, size = 240): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
}
