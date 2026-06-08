// Serve resized images via the weserv CDN instead of full-resolution originals.
// Work files can be several MB; loading them at thumbnail size is wasteful and
// slow. These helpers wrap a (signed) storage URL so the browser downloads a
// small, right-sized image.

function weserv(url, params) {
  if (!url) return url;
  const src = 'ssl:' + url.replace(/^https?:\/\//, '');
  return `https://images.weserv.nl/?url=${encodeURIComponent(src)}&${params}`;
}

// Small square thumbnail (cabinet rows, pipeline, juror queue).
export function imgThumb(url, size = 160) {
  return weserv(url, `w=${size}&h=${size}&fit=cover&output=jpg&q=80`);
}

// Full-width display image, capped width (application/review pages).
export function imgScaled(url, width = 1400) {
  return weserv(url, `w=${width}&output=jpg&q=82`);
}
