// Single source of truth for tier pricing. The platform quotes one currency,
// USD, on every channel: two acquirers billing in two different currencies made
// the same application cost two different amounts depending on where the card
// was issued.
//
// The price is flat per work - 40 USD each, so the tiers are simply multiples.
// It stays a table rather than a multiplication because what a tier costs is a
// decision, and a decision belongs somewhere it can be read and changed.
const PER_WORK = 40;
const TABLE = {
  1: { amount: PER_WORK, currency: 'USD' },
  2: { amount: PER_WORK * 2, currency: 'USD' },
  3: { amount: PER_WORK * 3, currency: 'USD' },
};

export function amountFor(tier) {
  const t = Math.min(Math.max(Number(tier) || 1, 1), 3);
  return TABLE[t];
}
