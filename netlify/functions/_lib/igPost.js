import { getIgToken } from './igToken.js';

// Instagram Login API (Instagram-scoped tokens publish here).
const GRAPH = 'https://graph.instagram.com/v21.0';

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
  const postId = await igPublish(igUserId, token, { imageUrls, caption });
  await admin.from('applications').update({ published_at: new Date().toISOString() }).eq('id', app.id);
  return { status: 'published', postId };
}
