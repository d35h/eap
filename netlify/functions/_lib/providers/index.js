import { mock } from './mock.js';
import { bepaid } from './bepaid.js';
import { georgia } from './georgia.js';

const REGISTRY = { mock, bepaid, georgia };

export function getProvider(id) {
  const p = REGISTRY[id];
  if (!p) throw new Error(`Unknown payment provider: ${id}`);
  return p;
}

// Which channels are usable, based on configured env.
export function activeChannels(env) {
  const channels = [];
  if (env.PAYMENTS_PROVIDER === 'mock') channels.push('mock');
  if (env.BEPAID_SHOP_ID) channels.push('bepaid');
  if (env.GEORGIA_CLIENT_ID) channels.push('georgia');
  return channels;
}
