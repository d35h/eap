import { getIgToken } from './igToken.js';

// Instagram Login API (Instagram-scoped tokens publish here).
const GRAPH = 'https://graph.instagram.com/v21.0';

const cfg = (env) => ({
  hashtags: env.IG_HASHTAGS || '#EAP #CallForArtists #ContemporaryArt #EurasiaExhibition',
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
//   #EAP #CallForArtists #ContemporaryArt #EurasiaExhibition
function buildCaption(app, c, opts = {}) {
  const name = [app.first_name, app.last_name].filter(Boolean).join(' ') || 'Artist';
  const handle = igHandle(app.instagram);
  const extras = [];
  // Instagram: @handle mention. Facebook: full instagram.com URL (FB can't link @).
  if (handle) extras.push(opts.igUrl ? `https://www.instagram.com/${handle}/` : `@${handle}`);
  if (app.website) extras.push(String(app.website).trim());

  const lines = [];
  if (!opts.igUrl) lines.push(''); // IG: blank first line so the caption starts below the username
  lines.push(name + (extras.length ? ` ${extras.join(' | ')}` : ''));
  lines.push('');

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

const xmlEsc = (s) => String(s || '').replace(/[<>&'"]/g, (c) =>
  ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

// Build a 9:16 story frame: artwork on the brand-dark canvas with the artist's
// name + @handle + footer baked in. We compose an SVG (artwork embedded as a
// data URI + text), store it, and let the weserv CDN rasterize it to JPEG —
// so no native image library is needed in the function.
async function buildStoryUrl(admin, app, signedArtworkUrl) {
  const res = await fetch(igReadyUrl(signedArtworkUrl));
  const b64 = Buffer.from(await res.arrayBuffer()).toString('base64');
  const name = xmlEsc([app.first_name, app.last_name].filter(Boolean).join(' ') || 'Artist');
  const handle = igHandle(app.instagram);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <rect width="1080" height="1920" fill="#121417"/>
  <image href="data:image/jpeg;base64,${b64}" x="140" y="300" width="800" height="800" preserveAspectRatio="xMidYMid meet"/>
  <text x="540" y="1360" text-anchor="middle" font-family="Georgia, serif" font-weight="bold" font-size="70" fill="#f0ece4">${name}</text>
  ${handle ? `<text x="540" y="1440" text-anchor="middle" font-family="sans-serif" font-size="46" fill="#c2a063">@${xmlEsc(handle)}</text>` : ''}
  <text x="540" y="1540" text-anchor="middle" font-family="sans-serif" font-size="30" fill="#9a9a9a" letter-spacing="2">EURASIA ART PLATFORM · OPEN CALL</text>
</svg>`;
  const path = `applications/${app.id}/_story.svg`;
  await admin.storage.from('works').upload(path, svg, { contentType: 'image/svg+xml', upsert: true });
  const { data } = await admin.storage.from('works').createSignedUrl(path, 600);
  const src = 'ssl:' + data.signedUrl.replace(/^https?:\/\//, '');
  return `https://images.weserv.nl/?url=${encodeURIComponent(src)}&output=jpg&w=1080&h=1920&q=90`;
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

async function igPublish(igUserId, token, { imageUrls, caption, userTag }) {
  // Photo tag on the feed post → notifies the artist + gives them the
  // "Add to your story" repost option.
  const tags = userTag ? [{ username: userTag, x: 0.5, y: 0.92 }] : null;
  let containerId;
  if (imageUrls.length === 1) {
    const body = { image_url: imageUrls[0], caption, access_token: token };
    if (tags) body.user_tags = tags;
    const c = await gp(`${igUserId}/media`, body);
    containerId = c.id;
  } else {
    const children = [];
    for (const url of imageUrls) {
      const body = { image_url: url, is_carousel_item: true, access_token: token };
      if (tags) body.user_tags = tags;
      const c = await gp(`${igUserId}/media`, body);
      children.push(c.id);
    }
    const carousel = await gp(`${igUserId}/media`, {
      media_type: 'CAROUSEL', children: children.join(','), caption, access_token: token,
    });
    containerId = carousel.id;
  }
  await waitReady(containerId, token);
  const pub = await gp(`${igUserId}/media_publish`, { creation_id: containerId, access_token: token });
  return finalizePost(igUserId, token, pub);
}

// Publish the same images + caption to a Facebook Page (multi-photo feed post).
async function fbPost(pageId, pageToken, { imageUrls, message }) {
  const FB = 'https://graph.facebook.com/v21.0';
  const fbCall = async (path, body) => {
    const res = await fetch(`${FB}/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || d.error) throw new Error(JSON.stringify(d.error || d));
    return d;
  };
  // Upload each photo unpublished, then attach them to one feed post.
  const attached = [];
  for (const url of imageUrls) {
    const p = await fbCall(`${pageId}/photos`, { url, published: false, access_token: pageToken });
    attached.push({ media_fbid: p.id });
  }
  const post = await fbCall(`${pageId}/feed`, { message, attached_media: attached, access_token: pageToken });
  let url = `https://www.facebook.com/${post.id}`;
  try {
    const res = await fetch(`${FB}/${post.id}?fields=permalink_url&access_token=${pageToken}`);
    const d = await res.json().catch(() => ({}));
    if (d.permalink_url) url = d.permalink_url;
  } catch { /* ignore */ }
  return url;
}

// Publish a single image as a 24h story.
async function igPublishStory(igUserId, token, imageUrl) {
  const c = await gp(`${igUserId}/media`, { image_url: imageUrl, media_type: 'STORIES', access_token: token });
  await waitReady(c.id, token);
  await gp(`${igUserId}/media_publish`, { creation_id: c.id, access_token: token });
}

async function finalizePost(igUserId, token, pub) {
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
  const rawUrls = (signed || []).map((s) => s.signedUrl).filter(Boolean).slice(0, 10);

  const caption = buildCaption(app, cfg(env));
  const handle = igHandle(app.instagram) || undefined;
  const feedImages = rawUrls.map(igReadyUrl);
  let igUrl = null;
  let fbUrl = null;

  // 1) Instagram feed carousel (caption @-mentions + photo-tags the artist).
  //    Best-effort so a block/failure doesn't abort the Facebook post.
  try {
    let post;
    try {
      post = await igPublish(igUserId, token, { imageUrls: feedImages, caption, userTag: handle });
    } catch (e) {
      console.error('IG publish with tag failed, retrying without tag:', e?.message || e);
      post = await igPublish(igUserId, token, { imageUrls: feedImages, caption });
    }
    igUrl = post.permalink;

    // 2) One 24h story with name + @handle + footer (only if the feed worked).
    if (env.IG_PUBLISH_STORIES !== 'false' && rawUrls[0]) {
      try {
        const storyUrl = await buildStoryUrl(admin, app, rawUrls[0]);
        await igPublishStory(igUserId, token, storyUrl);
      } catch (e) { console.error('IG story failed:', e?.message || e); }
    }
  } catch (e) { console.error('IG feed failed:', e?.message || e); }

  // 3) Facebook Page post (instagram shown as a URL). Best-effort, independent.
  if (env.FB_PAGE_ID && env.FB_PAGE_TOKEN) {
    try {
      const fbMessage = buildCaption(app, cfg(env), { igUrl: true });
      fbUrl = await fbPost(env.FB_PAGE_ID, env.FB_PAGE_TOKEN, { imageUrls: feedImages, message: fbMessage });
    } catch (e) { console.error('FB publish failed:', e?.message || e); }
  }

  if (igUrl || fbUrl) {
    await admin.from('applications')
      .update({ published_at: new Date().toISOString(), instagram_url: igUrl, facebook_url: fbUrl })
      .eq('id', app.id);
    return { status: 'published', permalink: igUrl, facebookUrl: fbUrl };
  }
  return { status: 'error', error: 'all platforms failed' };
}
