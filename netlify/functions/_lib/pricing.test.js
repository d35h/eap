import { describe, it, expect } from 'vitest';
import { amountFor } from './pricing.js';

describe('amountFor', () => {
  it('charges a flat 40 USD per work', () => {
    expect(amountFor(1)).toEqual({ amount: 40, currency: 'USD' });
    expect(amountFor(2)).toEqual({ amount: 80, currency: 'USD' });
    expect(amountFor(3)).toEqual({ amount: 120, currency: 'USD' });
  });
  it('clamps out-of-range tiers to 1..3', () => {
    expect(amountFor(0)).toEqual({ amount: 40, currency: 'USD' });
    expect(amountFor(9)).toEqual({ amount: 120, currency: 'USD' });
  });
});
