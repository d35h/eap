// Single source of truth for tier pricing. The platform quotes one currency,
// USD, on every channel: two acquirers billing in two different currencies made
// the same application cost two different amounts depending on where the card
// was issued. These are the former BYN tiers converted (100 BYN ~ 30 USD).
const TABLE = {
  1: { amount: 30, currency: 'USD' },
  2: { amount: 45, currency: 'USD' },
  3: { amount: 50, currency: 'USD' },
};

export function amountFor(tier) {
  const t = Math.min(Math.max(Number(tier) || 1, 1), 3);
  return TABLE[t];
}
