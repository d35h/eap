// Single source of truth for tier pricing. EUR amounts are the Georgian-channel
// equivalents of the BYN tiers (confirm the rate with the acquirer).
const TABLE = {
  1: { byn: 100, eur: 30 },
  2: { byn: 150, eur: 45 },
  3: { byn: 170, eur: 50 },
};

export function amountFor(tier) {
  const t = Math.min(Math.max(Number(tier) || 1, 1), 3);
  return TABLE[t];
}
