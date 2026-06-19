import type { TravelBooking } from './types';

export interface BookingQrClient {
  name: string;
  phone: string;
  email?: string;
}

export interface BookingQrPayload {
  v: 1;
  booking_id: string;
  client: BookingQrClient;
  rental_car: {
    brand: string;
    model: string;
    license_plate: string | null;
    color: string | null;
  };
  storage: {
    needed: boolean;
    car: {
      brand: string;
      model: string;
      color: string | null;
      license_plate: string;
    } | null;
  };
  destination: string | null;
  period: {
    start: string;
    end: string;
  };
}

export function buildBookingQrPayload(
  booking: TravelBooking,
  client: BookingQrClient,
): string {
  const payload: BookingQrPayload = {
    v: 1,
    booking_id: booking.id,
    client: {
      name: client.name || '—',
      phone: client.phone || '—',
      ...(client.email ? { email: client.email } : {}),
    },
    rental_car: {
      brand: booking.car?.brand || '—',
      model: booking.car?.model || '—',
      license_plate: booking.car?.license_plate ?? null,
      color: booking.car?.color ?? null,
    },
    storage: {
      needed: booking.has_storage,
      car:
        booking.has_storage && booking.own_car_license_plate
          ? {
              brand: booking.own_car_brand || '—',
              model: booking.own_car_model || '—',
              color: booking.own_car_color ?? null,
              license_plate: booking.own_car_license_plate,
            }
          : null,
    },
    destination: booking.destination?.name ?? null,
    period: {
      start: booking.start_date,
      end: booking.end_date,
    },
  };

  return `PRIBOI:${JSON.stringify(payload)}`;
}

export function getBookingQrCodeUrl(data: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&bgcolor=ffffff&color=000000`;
}
