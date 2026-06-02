import { describe, it, expect } from 'vitest';
import { amountFor } from './pricing.js';

describe('amountFor', () => {
  it('maps tier to BYN minor units and EUR', () => {
    expect(amountFor(1)).toEqual({ byn: 100, eur: 30 });
    expect(amountFor(2)).toEqual({ byn: 150, eur: 45 });
    expect(amountFor(3)).toEqual({ byn: 170, eur: 50 });
  });
  it('clamps out-of-range tiers to 1..3', () => {
    expect(amountFor(0)).toEqual({ byn: 100, eur: 30 });
    expect(amountFor(9)).toEqual({ byn: 170, eur: 50 });
  });
});
