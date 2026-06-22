import { describe, it, expect } from 'vitest';
import { computePromoDiscount, applyDiscountToPrice } from './promos';
import { calculateTravelPrice } from './api';
import type { PartnerCar } from './types';

const mockCar: PartnerCar = {
  id: '1',
  partner_id: 'p1',
  location_id: 'l1',
  brand: 'Hyundai',
  model: 'Solaris',
  year: 2024,
  transmission: 'automatic',
  seats: 5,
  price_per_day: 3000,
  is_available: true,
  is_active: true,
  created_at: '',
  updated_at: '',
};

describe('calculateTravelPrice', () => {
  it('calculates rental + commission', () => {
    const result = calculateTravelPrice(mockCar, '2026-07-01', '2026-07-04', false, 0);
    expect(result.totalRentalDays).toBe(3);
    expect(result.totalRentalPrice).toBe(9000);
    expect(result.commissionPrice).toBe(1350);
    expect(result.totalPrice).toBe(10350);
  });

  it('applies seasonal discount to rental', () => {
    const result = calculateTravelPrice(mockCar, '2026-07-01', '2026-07-04', false, 0, 0, {
      seasonalDiscountPercent: 10,
      commissionRate: 15,
    });
    expect(result.seasonalDiscountAmount).toBe(900);
    expect(result.totalRentalPrice).toBe(8100);
    expect(result.commissionPrice).toBe(1215);
    expect(result.totalPrice).toBe(9315);
  });

  it('applies discount before commission', () => {
    const result = calculateTravelPrice(mockCar, '2026-07-01', '2026-07-04', false, 0, 1000);
    expect(result.totalPrice).toBe(9200);
    expect(result.discountAmount).toBe(1000);
  });
});

describe('promos', () => {
  it('computes percent discount', () => {
    expect(computePromoDiscount({ discount_type: 'percent', discount_value: 10 } as never, 10000)).toBe(1000);
  });

  it('applies discount to breakdown', () => {
    const base = calculateTravelPrice(mockCar, '2026-07-01', '2026-07-03', false, 0);
    const withDiscount = applyDiscountToPrice(base, 500);
    expect(withDiscount.totalPrice).toBeLessThan(base.totalPrice);
  });
});
