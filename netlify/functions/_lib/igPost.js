import { getIgToken } from './igToken.js';

// Instagram Login API (Instagram-scoped tokens publish here).
const GRAPH = 'https://graph.instagram.com/v21.0';

const cfg = (env) => ({
  hashtags: env.IG_HASHTAGS || '#EAP #CallForArtists #ContemporaryArt #EurasianExhibition',
});

function igHandle(raw) {
  if (!raw) return '';
  return String(raw).trim()
    .replace(/^@/, '')
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/\/+$/, '')
    .split(/[/?]/)[0];
}

// Caption:
//   Name @instagram | website
//
//   <title>, <year> — <media>. <size>   (one line per work)
//
//   #EAP #CallForArtists #ContemporaryArt #EurasianExhibition
function buildCaption(app, c) {
  const name = [app.first_name, app.last_name].filter(Boolean).join(' ') || 'Artist';
  const handle = igHandle(app.instagram);
  const extras = [];
  if (handle) extras.push(`@${handle}`);
  if (app.website) extras.push(String(app.website).trim());

  // Leading blank line so the caption starts below the username on Instagram.
  const lines = ['', name + (extras.length ? ` ${extras.join(' | ')}` : ''), ''];

  const works = (app.works || []).filter((w) => w.title || w.year || w.media || w.size);
  works.forEach((w) => {
    let l = w.title || '';
    if (w.year) l += (l ? ', ' : '') + w.year;
    if (w.media) l += (l ? ' — ' : '') + w.media;
    if (w.size) l += (l ? '. ' : '') + w.size;
    if (l) lines.push(l);
  });
  if (works.length) lines.push('');

  lines.push(c.hashtags);
  return lines.join('\n');
}

// Downscale + JPEG-compress + pad to a 1:1 square (brand-dark canvas) via the
// free images.weserv.nl CDN, so Instagram always accepts the image (well under
// the 8 MB limit and within the allowed aspect ratio). Instagram fetches THIS
// URL, which proxies the (time-limited) signed source URL.
function igReadyUrl(signedUrl) {
  const src = 'ssl:' + signedUrl.replace(/^https?:\/\//, '');
  return `https://images.weserv.nl/?url=${encodeURIComponent(src)}&w=1080&h=1080&fit=contain&cbg=121417&output=jpg&q=85`;
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Wait until a media container has finished processing, or publish will fail.
async function waitReady(containerId, token) {
  for (let i = 0; i < 8; i++) {
    const res = await fetch(`${GRAPH}/${containerId}?fields=status_code&access_token=${token}`);
    const d = await res.json().catch(() => ({}));
    if (d.status_code === 'FINISHED') return;
    if (d.status_code === 'ERROR') throw new Error('container processing error');
    await sleep(1500);
  }
  throw new Error('container not ready (timeout)');
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
  await waitReady(containerId, token);
  const pub = await gp(`${igUserId}/media_publish`, { creation_id: containerId, access_token: token });
  // Fetch the public permalink for the new post (best-effort).
  let permalink = null;
  try {
    const res = await fetch(`${GRAPH}/${pub.id}?fields=permalink&access_token=${token}`);
    const d = await res.json().catch(() => ({}));
    permalink = d.permalink || null;
  } catch { /* ignore */ }
  return { id: pub.id, permalink };
}

// Publish one application's works to Instagram and stamp published_at.
// Returns { status: 'published'|'skipped'|'no_token'|'error', ... }.
export async function publishApplication(admin, env, app) {
  const token = await getIgToken(admin, env);
  if (!token) return { status: 'no_token' };
  const igUserId = env.IG_USER_ID || 'me';

  const folder = `applications/${app.id}`;
  const { data: list } = await admin.storage.from('works').list(folder);
  // weserv converts to JPEG, so any common raster format is fine now.
  const images = (list || [])
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (!images.length) {
    await admin.from('applications').update({ published_at: new Date().toISOString() }).eq('id', app.id);
    return { status: 'skipped', reason: 'no usable images' };
  }
  const paths = images.map((f) => `${folder}/${f.name}`);
  const { data: signed } = await admin.storage.from('works').createSignedUrls(paths, 3600);
  const imageUrls = (signed || [])
    .map((s) => s.signedUrl).filter(Boolean).slice(0, 10)
    .map(igReadyUrl);

  const caption = buildCaption(app, cfg(env));
  const post = await igPublish(igUserId, token, { imageUrls, caption });
  await admin.from('applications')
    .update({ published_at: new Date().toISOString(), instagram_url: post.permalink })
    .eq('id', app.id);
  return { status: 'published', postId: post.id, permalink: post.permalink };
}
