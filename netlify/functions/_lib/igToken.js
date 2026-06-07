// Instagram token storage: kept in app_secrets (service-role only), bootstrapped
// from the IG_ACCESS_TOKEN env var, and auto-refreshed in place.

export async function getIgToken(admin, env) {
  const { data } = await admin
    .from('app_secrets').select('value').eq('key', 'ig_access_token').maybeSingle();
  if (data?.value) return data.value;
  if (env.IG_ACCESS_TOKEN) {
    await setIgToken(admin, env.IG_ACCESS_TOKEN);
    return env.IG_ACCESS_TOKEN;
  }
  return null;
}

export async function setIgToken(admin, value) {
  await admin.from('app_secrets').upsert({
    key: 'ig_access_token', value, updated_at: new Date().toISOString(),
  });
}
