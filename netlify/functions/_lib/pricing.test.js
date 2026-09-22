import { describe, it, expect } from 'vitest';
import { amountFor } from './pricing.js';

describe('amountFor', () => {
  it('maps tier to a USD amount', () => {
    expect(amountFor(1)).toEqual({ amount: 30, currency: 'USD' });
    expect(amountFor(2)).toEqual({ amount: 45, currency: 'USD' });
    expect(amountFor(3)).toEqual({ amount: 50, currency: 'USD' });
  });
  it('clamps out-of-range tiers to 1..3', () => {
    expect(amountFor(0)).toEqual({ amount: 30, currency: 'USD' });
    expect(amountFor(9)).toEqual({ amount: 50, currency: 'USD' });
  });
});
