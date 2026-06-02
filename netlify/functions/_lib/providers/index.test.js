import { describe, it, expect } from 'vitest';
import { getProvider, activeChannels } from './index.js';

describe('provider registry', () => {
  it('returns the mock provider', () => {
    expect(getProvider('mock').id).toBe('mock');
  });
  it('throws on unknown provider', () => {
    expect(() => getProvider('nope')).toThrow();
  });
  it('lists active channels from env', () => {
    expect(activeChannels({ PAYMENTS_PROVIDER: 'mock' })).toEqual(['mock']);
    expect(activeChannels({ BEPAID_SHOP_ID: 'x', GEORGIA_CLIENT_ID: 'y' }).sort()).toEqual(['bepaid', 'georgia']);
  });
});
