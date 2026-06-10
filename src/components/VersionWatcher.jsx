import { useEffect, useState } from 'react';

// The running app keeps the JS bundle it first loaded; a deploy ships a new
// hashed bundle but an open tab won't pick it up until a full reload. This
// quietly checks for a newer build and offers a refresh — so changes actually
// reach people who keep the site open.

function loadedBundleHash() {
  const s = document.querySelector('script[type="module"][src*="/assets/index-"]');
  const src = s?.getAttribute('src') || '';
  return src.split('/assets/')[1] || null; // index-<hash>.js
}

async function deployedBundleHash() {
  try {
    const res = await fetch(`/?_v=${Date.now()}`, { cache: 'no-store' });
    const html = await res.text();
    const m = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/);
    return m ? m[0].split('/assets/')[1] : null;
  } catch {
    return null;
  }
}

export default function VersionWatcher() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const current = loadedBundleHash();
    if (!current) return;
    let stopped = false;
    const check = async () => {
      if (stopped) return;
      const latest = await deployedBundleHash();
      if (latest && latest !== current) setStale(true);
    };
    const id = setInterval(check, 90000); // every 90s
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    check();
    return () => { stopped = true; clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  if (!stale) return null;
  return (
    <div className="version-toast" role="status" aria-live="polite">
      <span className="version-toast__text">Доступна новая версия сайта.</span>
      <button type="button" className="version-toast__btn" onClick={() => window.location.reload()}>
        Обновить
      </button>
    </div>
  );
}
