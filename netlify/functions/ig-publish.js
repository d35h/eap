import { makeAdmin } from './_lib/supabaseAdmin.js';

// Daily scheduled function: publish the next unpublished paid application of the
// current edition to Instagram (carousel of its work images + caption).
// Configured in netlify.toml (schedule). No-op without IG_* env vars.

const GRAPH = 'https://graph.facebook.com/v21.0';

// Caption text (env-overridable so you can tweak without code changes).
const cfg = (env) => ({
  biennale: env.IG_BIENNALE_NAME || 'Chianciano Biennale',
  museum: env.IG_MUSEUM || 'Chianciano Art Museum',
  year: env.IG_BIENNALE_YEAR || String(new Date().getFullYear()),
  hashtags: env.IG_HASHTAGS || '#ChiancianoBiennale #CallForArtists #ContemporaryArt #InternationalExhibition',
  site: env.PUBLIC_SITE_URL || '',
});

function igHandle(raw) {
  if (!raw) return '';
  return String(raw).trim()
    .replace(/^@/, '')
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/\/+$/, '')
    .split(/[/?]/)[0];
}

function buildCaption(app, c) {
  const name = [app.first_name, app.last_name].filter(Boolean).join(' ') || 'Artist';
  const country = (app.country || '').trim();
  const lines = [];
  lines.push(country ? `${name} #${country.replace(/\s+/g, '')}` : name);
  const handle = igHandle(app.instagram);
  if (handle) lines.push(`@${handle}`);
  lines.push('');
  lines.push(`Work presented during the open submission phase for the ${c.year} edition of the ${c.biennale}, organised by the ${c.museum}.`);
  lines.push('');
  lines.push('The curatorial review process is currently ongoing.');
  lines.push('');
  const works = (app.works || []).filter((w) => w.title || w.media || w.size);
  if (works.length) {
    lines.push(works.length > 1 ? 'Artworks:' : 'Artwork:');
    works.forEach((w) => {
      let l = w.title || '';
      if (w.year) l += `, ${w.year}`;
      if (w.media) l += ` — ${w.media}`;
      if (w.size) l += `. ${w.size}`;
      lines.push(l.trim());
    });
    lines.push('');
  }
  lines.push(`🎨 Submissions for ${c.biennale} ${c.year} remain open.`);
  lines.push('');
  lines.push('🔗 Further details via link in bio.');
  if (c.site) lines.push(c.site);
  lines.push(c.hashtags);
  return lines.join('\n');
}

async function gp(path, body) {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(JSON.stringify(data.error || data));
  return data;
}

async function igPublish(igUserId, token, { imageUrls, caption }) {
  let containerId;
  if (imageUrls.length === 1) {
    const c = await gp(`${igUserId}/media`, { image_url: imageUrls[0], caption, access_token: token });
    containerId = c.id;
  } else {
    const children = [];
    for (const url of imageUrls) {
      const c = await gp(`${igUserId}/media`, { image_url: url, is_carousel_item: true, access_token: token });
      children.push(c.id);
    }
    const carousel = await gp(`${igUserId}/media`, {
      media_type: 'CAROUSEL', children: children.join(','), caption, access_token: token,
    });
    containerId = carousel.id;
  }
  const pub = await gp(`${igUserId}/media_publish`, { creation_id: containerId, access_token: token });
  return pub.id;
}

export async function handler() {
  const env = process.env;
  if (!env.IG_USER_ID || !env.IG_ACCESS_TOKEN) {
    return { statusCode: 200, body: 'IG not configured' };
  }
  const admin = makeAdmin(env);

  const { data: cyc } = await admin.from('cycle_state').select('current_edition').eq('id', 1).maybeSingle();
  const edition = cyc?.current_edition || 1;

  const { data: apps } = await admin
    .from('applications').select('*')
    .eq('edition', edition).eq('payment_status', 'paid').is('published_at', null)
    .order('created_at', { ascending: true }).limit(1);
  const app = apps?.[0];
  if (!app) return { statusCode: 200, body: 'nothing to publish' };

  // Instagram fetches by URL and accepts JPEG only.
  const folder = `applications/${app.id}`;
  const { data: list } = await admin.storage.from('works').list(folder);
  const jpegs = (list || [])
    .filter((f) => /\.(jpe?g)$/i.test(f.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (!jpegs.length) {
    // Nothing postable - mark published so the queue keeps moving.
    await admin.from('applications').update({ published_at: new Date().toISOString() }).eq('id', app.id);
    return { statusCode: 200, body: 'no jpeg images, skipped' };
  }
  const paths = jpegs.map((f) => `${folder}/${f.name}`);
  const { data: signed } = await admin.storage.from('works').createSignedUrls(paths, 3600);
  const imageUrls = (signed || []).map((s) => s.signedUrl).filter(Boolean).slice(0, 10);

  const caption = buildCaption(app, cfg(env));

  try {
    const postId = await igPublish(env.IG_USER_ID, env.IG_ACCESS_TOKEN, { imageUrls, caption });
    await admin.from('applications').update({ published_at: new Date().toISOString() }).eq('id', app.id);
    return { statusCode: 200, body: `published ${app.id} → ${postId}` };
  } catch (e) {
    console.error('IG publish failed:', e?.message || e);
    return { statusCode: 200, body: 'publish failed' };
  }
}
