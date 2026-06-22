import { describe, it, expect } from 'vitest';
import { calculateStorageOnlyPrice } from './storageBooking';
import { computeAverageRating } from './reviews';

describe('calculateStorageOnlyPrice', () => {
  it('calculates storage + commission', () => {
    const result = calculateStorageOnlyPrice('2026-07-01', '2026-07-04', 500, 15);
    expect(result.totalStorageDays).toBe(3);
    expect(result.totalStoragePrice).toBe(1500);
    expect(result.totalRentalPrice).toBe(0);
    expect(result.commissionPrice).toBe(225);
    expect(result.totalPrice).toBe(1725);
  });

  it('applies promo discount before commission', () => {
    const result = calculateStorageOnlyPrice('2026-07-01', '2026-07-04', 500, 15, 200);
    expect(result.totalPrice).toBe(1495);
    expect(result.discountAmount).toBe(200);
  });
});

describe('reviews', () => {
  it('computes average rating', () => {
    expect(computeAverageRating([5, 4, 4])).toBe(4.3);
    expect(computeAverageRating([])).toBe(0);
  });
});
