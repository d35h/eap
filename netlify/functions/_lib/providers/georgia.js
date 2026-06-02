// Georgian acquiring adapter (TBC E-Commerce / BOG iPay), EUR. Scaffold.
// Requires GEORGIA_CLIENT_ID/secret. Not yet wired to the live API.
export const georgia = {
  id: 'georgia',
  createSession() {
    throw new Error('Georgia adapter not implemented — add GEORGIA_* credentials and the session request');
  },
  verifyWebhook() {
    throw new Error('Georgia webhook verification not implemented');
  },
};
