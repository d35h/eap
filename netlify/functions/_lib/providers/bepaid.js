// bePaid adapter (Belarusian channel, BYN). Scaffold against docs.bepaid.by.
// Requires BEPAID_SHOP_ID + BEPAID_SECRET to be active. Not yet wired to the
// live API — createSession throws until implemented with real credentials.
export const bepaid = {
  id: 'bepaid',
  createSession() {
    throw new Error('bePaid adapter not implemented — add BEPAID_* credentials and the token request');
  },
  verifyWebhook() {
    throw new Error('bePaid webhook verification not implemented');
  },
};
